# Atlas Watchdog Status

> Last updated: 2026-06-17 02:53 CST (tick 2026-06-16T1853Z)
> Watchdog: atlas-watchdog-5m cron — tick 2026-06-16T1853Z

## Head
`856d1b9aa735bdcc5313ec12fd981d01aa446e69` — local HEAD and origin/main in sync
- Prior tick (2026-06-16T1823Z) referenced `7e2875d`; HEAD advanced +1 self-commit (`856d1b9` prior tick sync commit)
- Local has untracked runtime dirs: .atlas/, atlas-server/data/, atlas-server/logs/, status/

## Commits since last watchdog check
- `856d1b9`: docs(atlas): watchdog 2026-06-16T1823Z — sync local commits to origin/main, state unchanged
- `7e2875d`: docs(atlas): watchdog 2026-06-16T1623Z — server UP, health route /health, docker services still gone
- `397ca3a`: docs(atlas): watchdog 2026-06-12T1336Z — server UP, health route /health, docker services still gone

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
- ✅ **atlas-server is UP** — :3100 responding via `node src/app.js`
- Backend health route: `GET /health` → `{"code":0,"message":"ok","data":{"status":"ok","service":"atlas-server"}}`
- ⚠️ **Docker services are GONE** — PostgreSQL and Redis containers absent from `docker ps`
  - `openclaw-mission-control-db-1` (PostgreSQL 16-alpine): not present
  - `openclaw-mission-control-redis-1` (Redis 7-alpine): not present
  - Only `searxng` container currently running on :8080
- Backend is mock-mvp-auth-signed backend, not via docker compose

## Reference Docs
- `docs/sprint2-wecom-kickoff.md` — Sprint 2 scope and kickoff plan
- `docs/tech-lead-sprint2-source-of-truth-2026-03-12.md` — acceptance criteria
- `docs/qa-wecom-auth-watchdog-2026-03-12.md` — WeCom auth findings