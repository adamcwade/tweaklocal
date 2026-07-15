// Neon over HTTP: one-shot request per query, no pool to leak across a function
// that can freeze mid-flight.
import { neon } from '@neondatabase/serverless';

let client = null;

export function db() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    client = neon(url);
  }
  return client;
}

/** @param {object} row Output of validate() — already whitelisted. */
export async function insertEvent(row) {
  const sql = db();
  // Diagnostic only. received_at (server now()) is what every query buckets on.
  const skewMs = row.clientTs ? Date.now() - row.clientTs.getTime() : null;
  const counts = row.counts ? JSON.stringify(row.counts) : null;
  await sql`
    insert into events (
      event, anonymous_id, version, node, platform, tailwind, framework, client_ts, skew_ms, counts
    ) values (
      ${row.event}, ${row.anonymousId}, ${row.version}, ${row.node}, ${row.platform},
      ${row.tailwind}, ${row.framework}, ${row.clientTs}, ${skewMs}, ${counts}::jsonb
    )
  `;
}
