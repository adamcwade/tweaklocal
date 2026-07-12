import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeTarget, applyTextEdit, applyClassEdit, applyStyleEdit, applyDeleteElement, parseLoc, checkSyntax } from './resolver.js';
import { classify, buildPrompt, runClaude } from './router.js';
import { initTelemetry, DISCLOSURE } from './telemetry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OVERLAY_PATH = path.join(__dirname, '..', 'overlay', 'overlay.js');
const VERSION = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
).version;

// Baseline for "estimated savings": median unscoped-agent edit from
// packages/benchmark results (sonnet, Read/Edit/Glob/Grep). Overridable.
const BASELINE = {
  usd: Number(process.env.TWEAKLOCAL_BASELINE_COST || 0.093),
  ms: Number(process.env.TWEAKLOCAL_BASELINE_MS || 19000),
};

function detectTailwind(root) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    return Boolean({ ...pkg.dependencies, ...pkg.devDependencies }.tailwindcss);
  } catch {
    return false;
  }
}

export function startServer({ root, port = 4100 }) {
  const undoStack = new Map(); // id -> { abs, before }
  const running = new Map(); // id -> child process (for cancellation)
  const sseClients = new Set();
  let nextId = 1;
  const tailwind = detectTailwind(root);
  const telemetry = initTelemetry({ version: VERSION, tailwind });

  const savingsPath = path.join(root, '.tweaklocal', 'savings.json');
  let totals = { usd: 0, ms: 0, count: 0 };
  try { totals = JSON.parse(fs.readFileSync(savingsPath, 'utf8')); } catch { /* first run */ }
  function recordSavings(costUSD = 0, ms = 0) {
    const saved = { usd: Math.max(0, BASELINE.usd - costUSD), ms: Math.max(0, BASELINE.ms - ms) };
    totals.usd += saved.usd;
    totals.ms += saved.ms;
    totals.count += 1;
    try {
      fs.mkdirSync(path.dirname(savingsPath), { recursive: true });
      fs.writeFileSync(savingsPath, JSON.stringify(totals));
    } catch { /* savings persistence is best-effort */ }
    return { saved, totals };
  }

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
        return json(res, { ok: true, root, totals, tailwind, telemetry: !telemetry.disabled });
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
          telemetry.record('copy');
          broadcast({ type: 'tweak', id, kind: 'copy', status: 'done', tokens: 0, label: `copy: "${body.newText.slice(0, 40)}"`, ...recordSavings(0, 50) });
          return json(res, { ok: true, id });
        }

        if (url.pathname === '/api/edit-class') {
          const id = nextId++;
          const write = applyClassEdit(root, body.loc, body.remove || [], body.add || []);
          remember(id, write);
          telemetry.record('style');
          broadcast({ type: 'tweak', id, kind: 'style', status: 'done', tokens: 0, label: `style: ${(body.add || []).join(' ')}`, ...recordSavings(0, 50) });
          return json(res, { ok: true, id });
        }

        if (url.pathname === '/api/edit-style') {
          const id = nextId++;
          const write = applyStyleEdit(root, body.loc, body.styles || {});
          remember(id, write);
          const desc = Object.entries(body.styles || {})
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');
          telemetry.record('style');
          broadcast({ type: 'tweak', id, kind: 'style', status: 'done', tokens: 0, label: `style: ${desc.slice(0, 50)}`, ...recordSavings(0, 50) });
          return json(res, { ok: true, id });
        }

        if (url.pathname === '/api/delete') {
          if (body.dryRun) {
            applyDeleteElement(root, body.loc, { dryRun: true }); // throws if unsafe, writes nothing
            return json(res, { ok: true, dryRun: true });
          }
          const id = nextId++;
          const target = describeTarget(root, body.loc);
          const write = applyDeleteElement(root, body.loc);
          remember(id, write);
          telemetry.record('delete');
          const label = write.removedUsage
            ? `removed <${write.removedUsage}> usage`
            : `deleted <${target.tagName}>`;
          broadcast({ type: 'tweak', id, kind: 'delete', status: 'done', tokens: 0, label, ...recordSavings(0, 50) });
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

        if (url.pathname === '/api/cancel') {
          const child = running.get(String(body.id));
          if (!child) return json(res, { ok: false, error: 'task not running' }, 404);
          child.__cancel(); // kills the process; the nl handler restores the file
          return json(res, { ok: true });
        }

        if (url.pathname === '/api/classify') {
          // dry-run the router: no file writes, no model edit run (the hybrid
          // router may still consult the Haiku classifier on ambiguous input)
          const route = await classify(body.instruction || '', { cwd: root });
          return json(res, { ok: true, ...route });
        }

        if (url.pathname === '/api/nl') {
          const id = nextId++;
          const { file } = parseLoc(body.loc);
          const target = describeTarget(root, body.loc);
          const route = await classify(body.instruction, { cwd: root });
          const abs = path.resolve(root, file);
          remember(id, { abs, before: fs.readFileSync(abs, 'utf8') });
          telemetry.record('nl');
          broadcast({ type: 'tweak', id, kind: route.kind, status: 'queued', model: route.model, effort: route.effort, tier: route.tier, label: body.instruction.slice(0, 60) });
          json(res, { ok: true, id, model: route.model, effort: route.effort, tier: route.tier, kind: route.kind });

          const restore = () => {
            const entry = undoStack.get(String(id));
            if (entry) fs.writeFileSync(entry.abs, entry.before);
          };

          const prompt = buildPrompt({ file, target, instruction: body.instruction, tailwind });
          const result = await runClaude({
            prompt,
            model: route.model,
            effort: route.effort,
            cwd: root,
            onEvent: (e) => broadcast({ type: 'tweak', id, ...e }),
            onSpawn: (child) => running.set(String(id), child),
          });
          running.delete(String(id));

          // Cancelled mid-run: undo any partial edit and stop — no retry, no
          // savings credit.
          if (result.cancelled) {
            restore();
            undoStack.delete(String(id));
            broadcast({ type: 'tweak', id, status: 'cancelled', model: route.model });
            return;
          }

          // The model's edit must leave the file parseable: retry once with
          // the parse error, then revert if it's still broken.
          let parseErr = checkSyntax(root, file);
          if (result.ok && parseErr) {
            broadcast({ type: 'tweak', id, status: 'running', model: route.model, label: `${body.instruction.slice(0, 40)} (fixing syntax)` });
            const retry = await runClaude({
              prompt: `Your previous edit to ${file} left it with a JSX/JS syntax error:\n${parseErr}\n\nFix ${file} so it parses cleanly while preserving the intended change: ${body.instruction}\nEdit ONLY that file.`,
              model: route.model,
              effort: route.effort,
              cwd: root,
              onSpawn: (child) => running.set(String(id), child),
            });
            running.delete(String(id));
            if (retry.cancelled) {
              restore();
              undoStack.delete(String(id));
              broadcast({ type: 'tweak', id, status: 'cancelled', model: route.model });
              return;
            }
            result.durationMs += retry.durationMs || 0;
            if (retry.costUSD) result.costUSD = (result.costUSD || 0) + retry.costUSD;
            parseErr = checkSyntax(root, file);
          }
          if (parseErr) {
            restore();
            result.ok = false;
            result.error = `edit reverted — file was left unparseable: ${parseErr.slice(0, 120)}`;
          }

          broadcast({
            type: 'tweak',
            id,
            status: result.ok ? 'done' : 'error',
            model: route.model,
            effort: route.effort,
            tier: route.tier,
            durationMs: result.durationMs,
            costUSD: result.costUSD,
            error: result.error,
            ...(result.ok ? recordSavings(result.costUSD || 0, result.durationMs || 0) : {}),
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
        `[tweaklocal] port ${port} is already in use (another daemon running?).\n` +
          `         Stop it with: lsof -ti:${port} | xargs kill\n` +
          `         Or pick another port: tweaklocal --port ${port + 1} (and set window.TWEAKLOCAL_ORIGIN to match)`
      );
      process.exit(1);
    }
    throw e;
  });
  server.listen(port, () => {
    console.log(`[tweaklocal] daemon on http://localhost:${port} (root: ${root})`);
    console.log('[tweaklocal] docs & updates → https://tweaklocal.dev');
    if (telemetry.firstRun && !telemetry.disabled) console.log(DISCLOSURE);
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
