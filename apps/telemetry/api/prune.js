// Monthly retention cron (see crons in vercel.json). Not hoarding is part of the
// promise — 400 days is enough for year-over-year and nothing beyond it is useful.
//
// Vercel sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set.
import { db } from '../lib/db.js';
import { tokenFrom, tokenOk } from '../lib/auth.js';

const RETENTION_DAYS = 400;

export default async function handler(req, res) {
  if (!tokenOk(tokenFrom(req), process.env.CRON_SECRET)) {
    res.statusCode = 401;
    return res.end();
  }
  try {
    const sql = db();
    const rows = await sql`
      delete from events
      where received_at < now() - make_interval(days => ${RETENTION_DAYS})
      returning id
    `;
    console.log(`[telemetry] pruned ${rows.length} rows older than ${RETENTION_DAYS}d`);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ pruned: rows.length }));
  } catch (err) {
    console.error('[telemetry] prune failed:', err.message);
    res.statusCode = 500;
    return res.end();
  }
}
