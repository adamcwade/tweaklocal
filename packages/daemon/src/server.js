import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeTarget, applyTextEdit, applyClassEdit, parseLoc } from './resolver.js';
import { classify, buildPrompt, runClaude } from './router.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OVERLAY_PATH = path.join(__dirname, '..', 'overlay', 'overlay.js');

export function startServer({ root, port = 4100 }) {
  const undoStack = new Map(); // id -> { abs, before }
  const sseClients = new Set();
  let nextId = 1;

  function broadcast(event) {
    const line = `data: ${JSON.stringify(event)}\n\n`;
    for (const res of sseClients) res.write(line);
  }

  function remember(id, write) {
    undoStack.set(String(id), { abs: write.abs, before: write.before });
  }

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    if (req.method === 'OPTIONS') return res.end();

    const url = new URL(req.url, `http://localhost:${port}`);

    try {
      if (req.method === 'GET' && url.pathname === '/overlay.js') {
        res.setHeader('Content-Type', 'text/javascript');
        return res.end(fs.readFileSync(OVERLAY_PATH));
      }

      if (req.method === 'GET' && url.pathname === '/api/health') {
        return json(res, { ok: true, root });
      }

      if (req.method === 'GET' && url.pathname === '/api/events') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });
        res.write('\n');
        sseClients.add(res);
        req.on('close', () => sseClients.delete(res));
        return;
      }

      if (req.method === 'POST') {
        const body = await readJson(req);

        if (url.pathname === '/api/resolve') {
          return json(res, describeTarget(root, body.loc));
        }

        if (url.pathname === '/api/edit-text') {
          const id = nextId++;
          const write = applyTextEdit(root, body.loc, body.oldText, body.newText);
          remember(id, write);
          broadcast({ type: 'tweak', id, kind: 'copy', status: 'done', tokens: 0, label: `copy: "${body.newText.slice(0, 40)}"` });
          return json(res, { ok: true, id });
        }

        if (url.pathname === '/api/edit-class') {
          const id = nextId++;
          const write = applyClassEdit(root, body.loc, body.remove || [], body.add || []);
          remember(id, write);
          broadcast({ type: 'tweak', id, kind: 'style', status: 'done', tokens: 0, label: `style: ${(body.add || []).join(' ')}` });
          return json(res, { ok: true, id });
        }

        if (url.pathname === '/api/undo') {
          const entry = undoStack.get(String(body.id));
          if (!entry) return json(res, { ok: false, error: 'unknown tweak id' }, 404);
          fs.writeFileSync(entry.abs, entry.before);
          undoStack.delete(String(body.id));
          broadcast({ type: 'tweak', id: body.id, status: 'reverted' });
          return json(res, { ok: true });
        }

        if (url.pathname === '/api/nl') {
          const id = nextId++;
          const { file } = parseLoc(body.loc);
          const target = describeTarget(root, body.loc);
          const route = classify(body.instruction);
          const abs = path.resolve(root, file);
          remember(id, { abs, before: fs.readFileSync(abs, 'utf8') });
          broadcast({ type: 'tweak', id, kind: route.kind, status: 'queued', model: route.model, label: body.instruction.slice(0, 60) });
          json(res, { ok: true, id, model: route.model, kind: route.kind });

          const prompt = buildPrompt({ file, target, instruction: body.instruction });
          const result = await runClaude({
            prompt,
            model: route.model,
            cwd: root,
            onEvent: (e) => broadcast({ type: 'tweak', id, ...e }),
          });
          broadcast({
            type: 'tweak',
            id,
            status: result.ok ? 'done' : 'error',
            model: route.model,
            durationMs: result.durationMs,
            costUSD: result.costUSD,
            error: result.error,
          });
          return;
        }
      }

      res.statusCode = 404;
      res.end('not found');
    } catch (e) {
      json(res, { ok: false, error: e.message }, 400);
    }
  });

  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.error(
        `[fastui] port ${port} is already in use (another daemon running?).\n` +
          `         Stop it with: lsof -ti:${port} | xargs kill\n` +
          `         Or pick another port: fastui --port ${port + 1} (and set window.FASTUI_ORIGIN to match)`
      );
      process.exit(1);
    }
    throw e;
  });
  server.listen(port, () => {
    console.log(`[fastui] daemon on http://localhost:${port} (root: ${root})`);
  });
  return server;
}

function json(res, obj, status = 200) {
  if (res.writableEnded) return;
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}
