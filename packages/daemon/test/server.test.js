// Tweak ids are a cross-process contract, not a per-boot detail.
//
// The overlay persists its alert history in localStorage and keys each row by
// tweak id. localStorage outlives the daemon, so an id counter that restarts at
// 1 on every boot hands a fresh tweak the same id as a row already hydrated from
// a previous session. addTweak() only appends when the id is new — an id it has
// seen updates that row in place — so the newest alert silently mutates an old
// row wherever it happens to sit instead of appearing at the bottom of the tray.
//
// Run: pnpm --filter cmdzero test
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Keep the daemon's telemetry off the wire for the duration of these tests.
process.env.DO_NOT_TRACK = '1';

const { startServer } = await import('../src/server.js');

const SOURCE = `export default function Foo() {
  return (
    <div className="wrap">
      <p>hello</p>
    </div>
  );
}
`;

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cmdzero-server-'));
  fs.mkdirSync(path.join(root, 'components'));
  fs.writeFileSync(path.join(root, 'components', 'Foo.tsx'), SOURCE);
  return root;
}

/** Boot a daemon on an ephemeral port, take one tweak id, shut it down. */
async function firstTweakIdOfaFreshDaemon() {
  const root = fixture();
  const server = startServer({ root, port: 0 });
  await once(server, 'listening');
  const { port } = server.address();
  try {
    const res = await fetch(`http://localhost:${port}/api/edit-text`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        loc: 'components/Foo.tsx:4:6',
        oldText: 'hello',
        newText: 'goodbye',
      }),
    });
    const body = await res.json();
    assert.equal(body.ok, true, `edit-text failed: ${JSON.stringify(body)}`);
    return body.id;
  } finally {
    server.close();
    await once(server, 'close');
  }
}

test('tweak ids do not repeat across daemon restarts', async () => {
  const first = await firstTweakIdOfaFreshDaemon();
  const second = await firstTweakIdOfaFreshDaemon(); // a restart, as far as the overlay can tell

  assert.notEqual(
    second,
    first,
    'a restarted daemon reissued an id the overlay may still be holding in localStorage',
  );
});

// An SSE stream that only ever writes when something happens is
// indistinguishable from a daemon that died: the browser keeps the EventSource
// in readyState OPEN, fires no error, and never reconnects — so every alert
// after a restart is lost while the writes themselves still land on disk.
//
// The heartbeat has to be a real event, not an SSE comment. Comments never
// reach onmessage, so a client can't use them to tell a live stream from a
// zombie one.
test('the event stream emits ping events while idle', async () => {
  const root = fixture();
  const server = startServer({ root, port: 0, heartbeatMs: 40 });
  await once(server, 'listening');
  const { port } = server.address();

  let req;
  try {
    const received = await new Promise((resolve, reject) => {
      req = http.get(`http://localhost:${port}/api/events`, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
          if (data.includes('ping')) resolve(data);
        });
      });
      req.on('error', reject);
      setTimeout(() => reject(new Error('no heartbeat arrived within 1s of an idle stream')), 1000);
    });

    const frame = received.split('\n').find((l) => l.startsWith('data:'));
    assert.ok(frame, `expected a data: frame, got ${JSON.stringify(received)}`);
    assert.equal(JSON.parse(frame.slice(5)).type, 'ping');
  } finally {
    // An SSE stream never ends on its own: without destroying it, close() waits
    // on a connection that will not hang up and the whole run stalls.
    req?.destroy();
    server.close();
    await once(server, 'close');
  }
});

test('tweak ids ascend within a single daemon session', async () => {
  const root = fixture();
  const server = startServer({ root, port: 0 });
  await once(server, 'listening');
  const { port } = server.address();
  const edit = async (oldText, newText) => {
    const res = await fetch(`http://localhost:${port}/api/edit-text`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ loc: 'components/Foo.tsx:4:6', oldText, newText }),
    });
    return (await res.json()).id;
  };
  try {
    const a = await edit('hello', 'second');
    const b = await edit('second', 'third');
    assert.ok(b > a, `expected ascending ids within a session, got ${a} then ${b}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
});
