// Anonymous usage telemetry — loud about itself, trivial to disable.
// Collected: package version, node version, OS platform, whether Tailwind was
// detected, and per-kind tweak COUNTS. Never: code, file paths, file names,
// prompts, or anything identifying. Disable with TWEAKLOCAL_TELEMETRY=0 or
// the DO_NOT_TRACK=1 convention.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const ENDPOINT =
  process.env.TWEAKLOCAL_TELEMETRY_URL || 'https://telemetry.tweaklocal.dev/v1/events';
const CONFIG_PATH = path.join(os.homedir(), '.tweaklocal', 'telemetry.json');
const FLUSH_MS = 60_000;

export function telemetryDisabled() {
  const v = String(process.env.TWEAKLOCAL_TELEMETRY ?? '').toLowerCase();
  if (v === '0' || v === 'false' || v === 'off') return true;
  if (String(process.env.DO_NOT_TRACK) === '1') return true;
  return false;
}

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function saveConfig(config) {
  try {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config));
  } catch {
    /* telemetry must never break the daemon */
  }
}

export const DISCLOSURE = [
  '[tweaklocal] Anonymous usage telemetry helps prioritize framework support.',
  '             Collected: version, OS, tweak counts. Never: code, file paths,',
  '             prompts, or anything identifying.',
  '             Opt out any time: TWEAKLOCAL_TELEMETRY=0  (DO_NOT_TRACK=1 also respected)',
].join('\n');

export function initTelemetry({ version, tailwind }) {
  let config = loadConfig();
  const firstRun = !config;
  if (firstRun) {
    // random id, derived from nothing — only distinguishes installs in aggregate
    config = { anonymousId: crypto.randomUUID(), notifiedAt: new Date().toISOString() };
    saveConfig(config);
  }
  const disabled = telemetryDisabled();
  const counts = { copy: 0, style: 0, delete: 0, nl: 0 };
  let flushTimer = null;

  function send(event, extra = {}) {
    if (disabled) return;
    try {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          event,
          anonymousId: config.anonymousId,
          version,
          node: process.version,
          platform: os.platform(),
          tailwind,
          ts: Date.now(),
          ...extra,
        }),
        signal: AbortSignal.timeout(3000),
      }).catch(() => {});
    } catch {
      /* fire and forget */
    }
  }

  function record(kind) {
    if (disabled || !(kind in counts)) return;
    counts[kind]++;
    if (!flushTimer) {
      flushTimer = setTimeout(() => {
        flushTimer = null;
        send('tweaks', { counts: { ...counts } });
        for (const k of Object.keys(counts)) counts[k] = 0;
      }, FLUSH_MS);
      flushTimer.unref?.();
    }
  }

  send('boot');
  return { firstRun, disabled, record };
}
