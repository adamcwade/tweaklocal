// The whitelist is the privacy guarantee. The README promises we collect
// version, node, OS, tailwind, and tweak counts — these tests are what make that
// a fact rather than an intention.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../lib/schema.js';

const boot = (over = {}) => ({
  event: 'boot',
  anonymousId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  version: '0.8.1',
  node: 'v20.11.0',
  platform: 'darwin',
  tailwind: true,
  ts: Date.now(),
  ...over,
});

test('accepts a well-formed boot', () => {
  const r = validate(boot());
  assert.ok(r.ok);
  assert.equal(r.row.version, '0.8.1');
  assert.equal(r.row.platform, 'darwin');
  assert.equal(r.row.tailwind, true);
  assert.ok(r.row.clientTs instanceof Date);
});

test('drops unknown fields entirely — nothing undisclosed reaches the row', () => {
  const r = validate(
    boot({ secret: 'hunter2', email: 'a@b.com', cwd: '/Users/adam/private/project' })
  );
  assert.ok(r.ok);
  const serialized = JSON.stringify(r.row);
  assert.doesNotMatch(serialized, /hunter2/);
  assert.doesNotMatch(serialized, /a@b\.com/);
  assert.doesNotMatch(serialized, /private/);
  assert.deepEqual(Object.keys(r.row).sort(), [
    'anonymousId',
    'clientTs',
    'counts',
    'event',
    'framework',
    'node',
    'platform',
    'tailwind',
    'version',
  ]);
});

test('rejects unattributable rows', () => {
  assert.equal(validate({}).ok, false);
  assert.equal(validate(null).ok, false);
  assert.equal(validate([]).ok, false);
  assert.equal(validate('nope').ok, false);
  assert.equal(validate(boot({ event: 'exfiltrate' })).ok, false);
  assert.equal(validate(boot({ anonymousId: 'not-a-uuid' })).ok, false);
  assert.equal(validate(boot({ version: 'latest' })).ok, false);
  assert.equal(validate(boot({ version: '1.2.3' + 'x'.repeat(40) })).ok, false);
});

test('bad descriptive fields cost a column, not the row', () => {
  const r = validate(boot({ node: 'garbage', tailwind: 'yes' }));
  assert.ok(r.ok);
  assert.equal(r.row.node, null);
  assert.equal(r.row.tailwind, null);
});

test('unknown platform is bucketed, never stored verbatim', () => {
  const r = validate(boot({ platform: 'x'.repeat(500) }));
  assert.ok(r.ok);
  assert.equal(r.row.platform, 'other');
});

test('implausible client clocks are dropped, row survives', () => {
  assert.equal(validate(boot({ ts: 0 })).row.clientTs, null);
  assert.equal(validate(boot({ ts: 4102444800000 })).row.clientTs, null); // year 2100
  assert.equal(validate(boot({ ts: 'now' })).row.clientTs, null);
  assert.ok(validate(boot({ ts: 'now' })).ok);
});

test('counts keep only the six known lanes', () => {
  const r = validate({
    ...boot({ event: 'tweaks' }),
    counts: { copy: 3, style: 1, evil: 99, __proto__: 'x' },
  });
  assert.ok(r.ok);
  assert.deepEqual(r.row.counts, { copy: 3, style: 1 });
});

test('counts are clamped and sanitized', () => {
  const r = validate({
    ...boot({ event: 'tweaks' }),
    counts: { copy: 1e9, style: -5, nl: 2.7, move: 'x' },
  });
  assert.deepEqual(r.row.counts, { copy: 100_000, nl: 2 });
});

test('boot never carries counts even if sent', () => {
  const r = validate({ ...boot(), counts: { copy: 5 } });
  assert.equal(r.row.counts, null);
});

test('framework is enum-guarded and absent on current clients', () => {
  assert.equal(validate(boot()).row.framework, null);
  assert.equal(validate(boot({ framework: 'next' })).row.framework, 'next');
  assert.equal(validate(boot({ framework: 'rm -rf /' })).row.framework, null);
});
