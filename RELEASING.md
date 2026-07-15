# Releasing

## `cmdzero` (packages/daemon)

1. `pnpm --filter cmdzero test` — includes the telemetry wire-format contract.
2. Bump `version` in `packages/daemon/package.json`.
3. **Smoke-test telemetry against production.** This is the step that would have
   caught a collector endpoint pointed at a domain that never existed:

   ```sh
   curl -f -sS -o /dev/null -w '%{http_code}\n' \
     -X POST https://telemetry.cmdzero.xyz/v1/events \
     -H 'content-type: application/json' \
     -d '{"event":"boot","anonymousId":"00000000-0000-4000-8000-000000000000","version":"0.0.0","node":"v20.0.0","platform":"linux","tailwind":false,"ts":'"$(date +%s)"'000}'
   ```

   Expect `202`. Anything else — especially a DNS failure — means the daemon you
   are about to publish will talk to nothing. `curl -f` exits non-zero on HTTP
   errors, so this is safe to wire into a script later.

   (That row lands in `events` with version `0.0.0`. The queries in
   `apps/telemetry/sql/queries.sql` don't filter it out; it's one row per release
   and not worth the complexity.)
4. `cd packages/daemon && npm publish`.
5. Watch `apps/telemetry/sql/queries.sql` → `version-adoption` over the next few
   days.

The client's telemetry is deliberately silent about its own failures, so nothing
will tell you if step 3 is skipped and the endpoint is broken. Don't skip step 3.

## Collector (apps/telemetry)

See [apps/telemetry/README.md](apps/telemetry/README.md). Note the DNS record is
an ignition switch for every daemon in the wild — deploy and verify on the
`*.vercel.app` URL first.
