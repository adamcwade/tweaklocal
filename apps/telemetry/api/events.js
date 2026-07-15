// POST /v1/events — the collector. Public, unauthenticated, and permanently so:
// cmdzero v0.8.1 is published with no key and will never gain one.
//
// No CORS headers, deliberately. The caller is fetch() inside a Node daemon, so
// there is no origin and no preflight — omitting them costs nothing and keeps a
// random web page from turning its visitors into event sources.
import { validate } from '../lib/schema.js';
import { insertEvent } from '../lib/db.js';

const MAX_BYTES = 4096; // a real payload is ~250 bytes
const INSERT_TIMEOUT_MS = 2500; // inside the client's 3s AbortSignal (telemetry.js:75)

function end(res, status) {
  res.statusCode = status;
  res.end();
}

async function readBody(req) {
  // Vercel's Node runtime parses application/json before we're invoked; the raw
  // stream path is for `node --test` and any host that doesn't.
  if (req.body !== undefined) {
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > MAX_BYTES) {
      const err = new Error('payload too large');
      err.tooLarge = true;
      throw err;
    }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return end(res, 405);
  }

  // Trust the header enough to bail early; readBody re-checks on the stream in
  // case it's absent or lying.
  if (Number(req.headers['content-length'] || 0) > MAX_BYTES) return end(res, 413);

  let body;
  try {
    body = await readBody(req);
  } catch (err) {
    return end(res, err.tooLarge ? 413 : 400);
  }

  const result = validate(body);
  if (!result.ok) return end(res, result.status);

  // The client ignores this response and aborts at 3s, so the only thing that
  // matters is not hanging. A dropped event beats a stalled daemon — 202 either
  // way, and the /api/stats canary is what notices if inserts stop landing.
  let timer;
  try {
    await Promise.race([
      insertEvent(result.row),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('insert timeout')), INSERT_TIMEOUT_MS);
      }),
    ]);
  } catch (err) {
    // Message only. Never log the body or the IP — neither is disclosed.
    console.error('[telemetry] insert failed:', err.message);
  } finally {
    clearTimeout(timer);
  }

  return end(res, 202);
}
