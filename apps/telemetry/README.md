# @cmdzero/telemetry

The collector behind `https://telemetry.cmdzero.xyz/v1/events`. First-party by
design: no third-party analytics processor sits in this path, because the daemon's
README and the landing page promise there isn't one.

Private workspace. Never published.

## Why this exists

`cmdzero` has shipped a telemetry client since v0.8.x. It had no server. Every
event went to a hostname that didn't resolve, and `.catch(() => {})` in the client
meant nothing ever said so. This is the missing half.

## Shape

| path | what |
|---|---|
| `POST /v1/events` | the collector (rewritten to `api/events.js`) |
| `GET /api/stats?token=…` | summary JSON, and the dead-pipe canary |
| `GET /api/prune` | monthly retention cron, `CRON_SECRET`-guarded |

`lib/schema.js` is the load-bearing file. The daemon spreads `...extra` into its
payload, so the request body is an open shape — anyone can POST anything at a
public endpoint. The validator builds a **new** object from known keys and drops
the rest. Never persist a raw body here; the privacy claim depends on it.

Same reason we don't store IP or `x-vercel-ip-country`, and never log bodies.
Vercel and Neon are subprocessors of our own pipeline — that's a different thing
from routing users into someone else's analytics product.

## Env

| var | where | what |
|---|---|---|
| `DATABASE_URL` | Production + Preview | Neon connection string |
| `STATS_TOKEN` | Production | bearer token for `/api/stats` |
| `CRON_SECRET` | Production | set it and Vercel sends it to `/api/prune` |

Locally: copy `.env.example` to `.env.local` and fill it in. `.env*` is gitignored
(`.env.example` excepted) — this repo is public, and `DATABASE_URL` is a full
read/write/drop credential, not a read key. Anything that runs locally against the
real database wants `node --env-file=.env.local`.

Production values go in the Vercel dashboard; `.env.local` never reaches it.

## Deploy

Live: Vercel project `a2-2024/cmdzero-telemetry`, deployed from this directory
(`vercel deploy`). The project has no Git connection, so CLI deploys go straight
to the **production** target — there is no preview/production split here, and
`vercel deploy` is not a dry run. The safety gate is DNS, not the deploy target.

1. Env vars (above) in the Vercel dashboard.
2. Apply `sql/001_init.sql` in the Neon console.
3. Add a WAF rate-limit rule on `/v1/events` — ~60 req/min/IP. A real daemon sends
   one boot per start and at most one tweaks flush per minute.
4. Verify against the `*.vercel.app` URL **before** touching DNS.

### Deployment Protection — read this before debugging a 401

`ssoProtection` is `all_except_custom_domains`:

- `*.vercel.app` → **401** + an SSO login page. Not usable for testing as-is.
- `telemetry.cmdzero.xyz` → **public**. This is the setting the collector needs;
  leave it alone. Daemons authenticate with nothing and never will.

To verify against a `*.vercel.app` URL, generate a Protection Bypass for
Automation secret (Settings → Deployment Protection), then either send
`x-vercel-protection-bypass: <secret>` as a header, or — the only form the daemon
can use, since it sends nothing but `content-type` — append
`?x-vercel-protection-bypass=<secret>` to `CMDZERO_TELEMETRY_URL`. Revoke it when
you're done; a standing bypass secret is a permanent hole in the protection.

The API wants exactly 32 alphanumeric characters:
`node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"`.

Beware the failure mode this creates: with SSO on, *everything* 401s, so a test
suite that only asserts "no forbidden data reached the database" will pass
vacuously. Always assert a row actually **landed** before trusting a negative.

## DNS

The endpoint is `telemetry.cmdzero.xyz`. **Not `.dev`** — see below.

`cmdzero.xyz` is delegated to Namecheap (`dns1/dns2.registrar-servers.com`), so
the record goes in **Namecheap's** Advanced DNS panel, not Vercel's and not
Google Cloud's. Vercel supports external DNS as a first-class path; the apex
already works this way.

1. Vercel project → Domains → add `telemetry.cmdzero.xyz`; it returns a target
   (normally `cname.vercel-dns.com`).
2. Namecheap → Domain List → cmdzero.xyz → Advanced DNS → Add New Record:
   - Type `CNAME Record`, Host `telemetry`, Value `cname.vercel-dns.com`, TTL 1 min
   - Namecheap's Host field is the subdomain only (`telemetry`), and it appends
     the zone itself — do **not** enter the FQDN or a trailing dot here. (Google
     Cloud DNS has the opposite convention; that's why this note exists.)
3. Wait for Vercel to show the domain valid + cert issued.

Keep the TTL low for the first few weeks: deleting the record is the only kill
switch, and you want it effective in minutes.

Check `dig CAA cmdzero.xyz +short` before flipping — any CAA that omits
`letsencrypt.org` will block Vercel's cert and every client will hit a TLS error.

### Why not cmdzero.dev

`cmdzero@0.8.1` shipped pointing at `telemetry.cmdzero.dev`, and that is frozen
forever for that version. We repointed to `.xyz` anyway: the package was two days
old with no real installed base (its download count was registry mirrors, not
humans), so stranding v0.8.1's telemetry cost nothing, and `.dev` was being
abandoned as the product domain.

Consequence: **every v0.8.1 install fails DNS forever.** That's harmless — the
client is fire-and-forget with a terminal `.catch` — but it means v0.8.1 is
invisible in the data. First real numbers come from 0.8.2+.

If `cmdzero.dev` is ever allowed to lapse, note that a stranger who re-registers
it would start receiving telemetry from any surviving v0.8.1 install. The payload
is anonymous and carries no code or paths, so the stakes are low, but it's a
reason to keep the registration parked rather than dropped.

## Reading the numbers

`sql/queries.sql`, pasted into the Neon console SQL editor. That's the interface.
`/api/stats` exists for the canary; it is not a dashboard and shouldn't become one.

On "installs": `anonymous_id` counts distinct `~/.cmdzero/telemetry.json` files
that ever booted. CI containers and reinstalls inflate it; one developer on two
machines counts twice. Say **install-ids**, not users.

`anonymous_id` is client-chosen, so the count is inflatable by anyone who cares.
This is vanity data, not billing data.

## The canary

`/api/stats` returns **503** when no event has landed in 24h (or ever). Point an
uptime monitor at it. That single signal covers DNS, a bad deploy, an expired
cert, and a suspended Neon compute.

It's meaningless until there's baseline traffic — useless the day before launch,
essential the week after.

## Tests

```sh
pnpm --filter @cmdzero/telemetry test   # whitelist + HTTP shell, no DB needed
pnpm --filter cmdzero test              # the client↔collector wire contract
```

The daemon's test suite imports `lib/schema.js` directly and runs the real client
payload through it. That cross-workspace import is the point: it's what keeps the
two halves from drifting apart in silence.
