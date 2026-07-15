// The HTTP shell. No database here: DATABASE_URL is deliberately unset, which
// makes every insert fail — and proves the property that actually matters, that
// a broken backend still returns 202 fast instead of hanging a user's daemon.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import handler from '../api/events.js';

let server;
let base;

const validBoot = {
  event: 'boot',
  anonymousId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  version: '0.8.1',
  node: 'v20.11.0',
  platform: 'darwin',
  tailwind: true,
  ts: Date.now(),
};

before(async () => {
  delete process.env.DATABASE_URL;
  server = http.createServer((req, res) => {
    handler(req, res).catch(() => {
      res.statusCode = 500;
      res.end();
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((r) => server.close(r));
});

const post = (body, headers = {}) =>
  fetch(`${base}/v1/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

test('rejects non-POST', async () => {
  const res = await fetch(`${base}/v1/events`);
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('allow'), 'POST');
});

test('rejects oversized bodies', async () => {
  const res = await post({ ...validBoot, pad: 'x'.repeat(8000) });
  assert.equal(res.status, 413);
});

test('rejects malformed JSON', async () => {
  const res = await post('{not json');
  assert.equal(res.status, 400);
});

test('rejects garbage payloads', async () => {
  assert.equal((await post({})).status, 400);
  assert.equal((await post({ ...validBoot, event: 'nope' })).status, 400);
  assert.equal((await post({ ...validBoot, anonymousId: 'x' })).status, 400);
});

test('accepts a valid payload with 202 even when the database is unreachable', async () => {
  const res = await post(validBoot);
  assert.equal(res.status, 202);
});

test('sends no CORS headers — the caller is Node, not a browser', async () => {
  const res = await post(validBoot);
  assert.equal(res.headers.get('access-control-allow-origin'), null);
});
