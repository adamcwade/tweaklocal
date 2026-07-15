// Whitelist validator for the v0.8.1 wire format.
//
// The daemon spreads `...extra` into its payload (packages/daemon/src/telemetry.js),
// so the body shape is open — anyone can POST arbitrary fields to a public endpoint.
// We therefore build a NEW object from known keys and drop everything else. Never
// persist the raw body: the README promises we collect version, node, OS, tailwind,
// and tweak counts, and this function is the only thing that makes that true.
//
// The wire format is frozen. v0.8.1 is published and will send this shape forever.

const EVENTS = new Set(['boot', 'tweaks']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SEMVER = /^\d+\.\d+\.\d+/;
const NODE_VERSION = /^v\d+\./;

// os.platform() values. Anything else is bucketed rather than stored verbatim,
// so an attacker can't use this field as free-text storage.
const PLATFORMS = new Set(['darwin', 'linux', 'win32', 'freebsd', 'openbsd', 'sunos', 'aix', 'android']);

// Not sent by any released client — see plan §7. When a future daemon starts
// reporting it (and discloses it), it lands here with no migration.
const FRAMEWORKS = new Set(['next', 'vite', 'remix', 'astro', 'webpack', 'unknown']);

// The six lanes in packages/daemon/src/telemetry.js.
const COUNT_KEYS = ['copy', 'style', 'delete', 'nl', 'move', 'deploy'];
const COUNT_MAX = 100_000;

const TS_MIN = Date.UTC(2020, 0, 1);
const DAY_MS = 86_400_000;

function reject(error) {
  return { ok: false, status: 400, error };
}

function cleanCounts(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const counts = {};
  for (const key of COUNT_KEYS) {
    const n = raw[key];
    if (!Number.isFinite(n) || n < 0) continue;
    counts[key] = Math.min(Math.floor(n), COUNT_MAX);
  }
  // Unknown keys never reach here — we iterate our list, not theirs.
  return Object.keys(counts).length ? counts : null;
}

/**
 * @param {unknown} body Parsed JSON from the request.
 * @returns {{ok: true, row: object} | {ok: false, status: number, error: string}}
 */
export function validate(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return reject('body must be an object');
  }

  // Identity fields: a row without these is unattributable noise, so reject.
  if (!EVENTS.has(body.event)) return reject('unknown event');
  if (typeof body.anonymousId !== 'string' || !UUID.test(body.anonymousId)) {
    return reject('anonymousId must be a uuid');
  }
  if (typeof body.version !== 'string' || body.version.length > 32 || !SEMVER.test(body.version)) {
    return reject('version must be semver');
  }

  // Descriptive fields: a bad value costs us one column, not the row.
  const node =
    typeof body.node === 'string' && body.node.length <= 16 && NODE_VERSION.test(body.node)
      ? body.node
      : null;

  const platform =
    typeof body.platform === 'string' ? (PLATFORMS.has(body.platform) ? body.platform : 'other') : null;

  const tailwind = typeof body.tailwind === 'boolean' ? body.tailwind : null;

  const framework =
    typeof body.framework === 'string' && FRAMEWORKS.has(body.framework) ? body.framework : null;

  // Client clock — untrusted. Kept only to derive skew; every query buckets on
  // received_at instead. An implausible value is dropped, not fatal.
  const ts = body.ts;
  const clientTs =
    Number.isFinite(ts) && ts >= TS_MIN && ts <= Date.now() + DAY_MS ? new Date(ts) : null;

  return {
    ok: true,
    row: {
      event: body.event,
      anonymousId: body.anonymousId,
      version: body.version,
      node,
      platform,
      tailwind,
      framework,
      clientTs,
      counts: body.event === 'tweaks' ? cleanCounts(body.counts) : null,
    },
  };
}
