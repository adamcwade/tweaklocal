-- The questions we actually ask. Paste into the Neon console SQL editor.
--
-- Every query buckets on received_at (server truth), never client_ts (spoofable).
--
-- On "installs": anonymous_id is a uuid in ~/.cmdzero/telemetry.json. It counts
-- distinct config files that ever booted — CI containers and reinstalls inflate
-- it, one dev on two machines counts twice. Say "install-ids", not "users".

-- name: install-ids-total
-- Cumulative distinct install-ids that have ever booted.
select count(distinct anonymous_id) as install_ids
from events
where event = 'boot';

-- name: install-ids-new-per-day
-- First sighting of each install-id, bucketed by day. This is the growth curve.
select date_trunc('day', first_seen) as day, count(*) as new_install_ids
from (
  select anonymous_id, min(received_at) as first_seen
  from events
  group by anonymous_id
) f
group by 1
order by 1 desc
limit 90;

-- name: active-per-day
-- DAU. A daemon boot or a tweak flush both count as activity.
select date_trunc('day', received_at) as day, count(distinct anonymous_id) as active
from events
where received_at > now() - interval '90 days'
group by 1
order by 1 desc;

-- name: active-per-week
select date_trunc('week', received_at) as week, count(distinct anonymous_id) as active
from events
where received_at > now() - interval '26 weeks'
group by 1
order by 1 desc;

-- name: version-adoption
-- Who's on what, over the trailing 7 days. Watch this after a publish.
select version,
       count(distinct anonymous_id) as install_ids,
       round(100.0 * count(distinct anonymous_id) / nullif(sum(count(distinct anonymous_id)) over (), 0), 1) as pct
from events
where received_at > now() - interval '7 days'
group by version
order by install_ids desc;

-- name: tweak-mix
-- Which lanes people actually use. counts are per-flush, so summing is correct.
select sum((counts->>'copy')::bigint)   as copy,
       sum((counts->>'style')::bigint)  as style,
       sum((counts->>'delete')::bigint) as "delete",
       sum((counts->>'nl')::bigint)     as nl,
       sum((counts->>'move')::bigint)   as move,
       sum((counts->>'deploy')::bigint) as deploy
from events
where event = 'tweaks'
  and received_at > now() - interval '30 days';

-- name: tweak-mix-share
-- Same thing as percentages — the "is the zero-token path carrying its weight" question.
select lane, total, round(100.0 * total / nullif(sum(total) over (), 0), 1) as pct
from (
  select key as lane, sum(value::bigint) as total
  from events, jsonb_each_text(counts)
  where event = 'tweaks'
    and received_at > now() - interval '30 days'
  group by key
) t
order by total desc;

-- name: platform-split
select coalesce(platform, 'unreported') as platform,
       count(distinct anonymous_id) as install_ids
from events
where received_at > now() - interval '30 days'
group by 1
order by install_ids desc;

-- name: tailwind-share
select coalesce(tailwind::text, 'unreported') as tailwind,
       count(distinct anonymous_id) as install_ids
from events
where received_at > now() - interval '30 days'
group by 1
order by install_ids desc;

-- name: framework-split
-- Empty until a client actually reports framework (see plan §7). The disclosure
-- says telemetry "helps prioritize framework support" — this is the query that
-- will finally answer that, once the field exists.
select coalesce(framework, 'unreported') as framework,
       count(distinct anonymous_id) as install_ids
from events
where received_at > now() - interval '30 days'
group by 1
order by install_ids desc;

-- name: clock-skew
-- Diagnostic. A cluster of wild skew is interesting; a sudden mass of impossible
-- skew is a spoofing tell.
select width_bucket(skew_ms, -3600000, 3600000, 12) as bucket,
       min(skew_ms) as min_skew,
       max(skew_ms) as max_skew,
       count(*) as rows
from events
where skew_ms is not null
  and received_at > now() - interval '30 days'
group by 1
order by 1;

-- name: freshness
-- What the /api/stats canary checks. If this is older than a day, the pipe is dead.
select max(received_at) as last_event, now() - max(received_at) as age
from events;
