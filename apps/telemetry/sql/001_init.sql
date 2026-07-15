-- cmdzero telemetry — raw event store.
-- Apply by hand in the Neon console. There is no migration runner; if this file
-- grows a sibling, number it 002_ and apply it the same way.

create table if not exists events (
  id            bigserial primary key,
  received_at   timestamptz not null default now(),  -- server truth; group by this
  event         text        not null,
  anonymous_id  uuid        not null,
  version       text        not null,
  node          text,
  platform      text,
  tailwind      boolean,
  framework     text,                                 -- no released client sends this yet
  client_ts     timestamptz,                          -- UNTRUSTED: client Date.now()
  skew_ms       bigint,                               -- server now() - client_ts, diagnostic only
  counts        jsonb                                 -- null for boot
);

-- client_ts is whatever the sender's clock claimed. It is spoofable and skewed,
-- and is kept only so skew_ms exists as a diagnostic. Never bucket time on it.
comment on column events.client_ts is 'Untrusted client clock. Do not group by this — use received_at.';

create index if not exists events_received_at_idx on events (received_at desc);
create index if not exists events_anon_received_idx on events (anonymous_id, received_at desc);
create index if not exists events_version_received_idx on events (version, received_at desc);
create index if not exists events_event_received_idx on events (event, received_at desc);
