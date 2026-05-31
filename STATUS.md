# Atlas Watchdog Status

> Last updated: 2026-06-01 02:52 CST (tick 2026-05-31T1852Z)
> Watchdog: atlas-watchdog-5m cron — tick 2026-05-31T1852Z

## Head
`ba0dec57e1cfab2b3e6bdac1f5bd2929854507fa` — local HEAD and origin/main are in sync; local is clean, no uncommitted changes
- Prior tick referenced `970a0e7`; HEAD advanced +1 commit since then (ba0dec5 watchdog)

## Commits since last watchdog check
- `ba0dec5`: watchdog tick — server UP, docker services still gone but backend healthy
- `a22ea80`: watchdog tick — server DOWN, docker services gone, backend offline
- `79c86bd`: watchdog tick — server DOWN, docker services stopped

## Sprint 2 State
- Sprint 2 P0 is two-part: (1) real WeCom auth acceptance, (2) frontend fallback-risk tightening in real-login mode
- Sprint 2 acceptance criteria frozen in `docs/tech-lead-sprint2-source-of-truth-2026-03-12.md`
- Backend auth contract: stub/integration PASS; real WeCom E2E still pending environment-backed acceptance
- Frontend: still has hybrid API + fallback paths that can mask integration failures

## Blockers
- No code-level blockers currently known
- Real WeCom E2E acceptance pending: needs real WeCom environment + 3 test identities (employee, manager, operation manager)
- `docs/tech-lead-sprint2-source-of-truth-2026-03-12.md` is the current single source of truth

## Server Status
- ✅ **atlas-server is UP** — PID 1203 running, :3100 responding {"code":0,"message":"ok","data":{"status":"ok","service":"atlas-server"}}
- ⚠️ **Docker services are GONE** — PostgreSQL and Redis containers absent from `docker ps`
  - `openclaw-mission-control-db-1` (PostgreSQL 16-alpine): not present
  - `openclaw-mission-control-redis-1` (Redis 7-alpine): not present
  - Only `searxng` container currently running on :8080
- Backend is mock-mvp-auth-signed backend running via `node src/app.js` (PID 1203), not via docker compose
- Backend is healthy at :3100

## Reference Docs
- `docs/sprint2-wecom-kickoff.md` — Sprint 2 scope and kickoff plan
- `docs/tech-lead-sprint2-source-of-truth-2026-03-12.md` — acceptance criteria
- `docs/qa-wecom-auth-watchdog-2026-03-12.md` — WeCom auth findings