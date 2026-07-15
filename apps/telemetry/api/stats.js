// GET /api/stats?token=… — a glanceable summary, and the dead-pipe canary.
//
// The canary is the point. A debug flag on the client only helps when someone
// thinks to look; this returns 503 when no event has landed in 24h, so an uptime
// monitor yells whether the cause is DNS, a bad deploy, an expired cert, or a
// suspended Neon branch. It is meaningless until there's baseline traffic.
//
// Do not grow this into a dashboard. The real interface is sql/queries.sql in
// the Neon console.
import { db } from '../lib/db.js';
import { tokenFrom, tokenOk } from '../lib/auth.js';

const STALE_MS = 24 * 60 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    return res.end();
  }
  if (!tokenOk(tokenFrom(req), process.env.STATS_TOKEN)) {
    res.statusCode = 401;
    return res.end();
  }

  const sql = db();
  try {
    const [fresh, installs, active, versions, tweaks, platforms] = await Promise.all([
      sql`select max(received_at) as last_event from events`,
      sql`select count(distinct anonymous_id)::int as n from events where event = 'boot'`,
      sql`select count(distinct anonymous_id)::int as n from events
          where received_at > now() - interval '24 hours'`,
      sql`select version, count(distinct anonymous_id)::int as n from events
          where received_at > now() - interval '7 days'
          group by version order by n desc limit 10`,
      sql`select key as lane, sum(value::bigint)::int as n from events, jsonb_each_text(counts)
          where event = 'tweaks' and received_at > now() - interval '30 days'
          group by key order by n desc`,
      sql`select coalesce(platform, 'unreported') as platform, count(distinct anonymous_id)::int as n
          from events where received_at > now() - interval '30 days'
          group by 1 order by n desc`,
    ]);

    const lastEvent = fresh[0]?.last_event ?? null;
    const ageMs = lastEvent ? Date.now() - new Date(lastEvent).getTime() : null;
    // No events ever, or none recently: both mean the pipe is unproven. Say so loudly.
    const stale = ageMs === null || ageMs > STALE_MS;

    res.statusCode = stale ? 503 : 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(
      JSON.stringify(
        {
          stale,
          lastEvent,
          ageMs,
          installIds: installs[0]?.n ?? 0,
          active24h: active[0]?.n ?? 0,
          versions,
          tweakMix: Object.fromEntries(tweaks.map((r) => [r.lane, r.n])),
          platforms: Object.fromEntries(platforms.map((r) => [r.platform, r.n])),
        },
        null,
        2
      )
    );
  } catch (err) {
    console.error('[telemetry] stats failed:', err.message);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'query failed' }));
  }
}
