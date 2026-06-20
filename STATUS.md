# Atlas Watchdog Status

> Last updated: 2026-06-20 08:34 CST (tick 2026-06-20T0034Z)
> Watchdog: atlas-watchdog-5m cron — tick 2026-06-20T0034Z

## Head
`38fa5751d26c66fa1e1086e8a95247eadc6b2333` — local main and origin/main in sync
- Prior tick (2026-06-18T2234Z) committed correction: prior STATUS.md had `28f9b76` as stale ref; actual HEAD at that tick was `38fa575`
- Local has untracked runtime dirs: .atlas/, atlas-server/data/, atlas-server/logs/, status/

## Commits since last watchdog check
- `38fa575`: docs(atlas): watchdog 2026-06-18T2234Z — correct HEAD ref (3decd38→28f9b76), state unchanged
- `28f9b76`: docs(atlas): watchdog 2026-06-18T1804Z — sync HEAD to 3decd38, state unchanged
- `3decd38`: docs(atlas): watchdog 2026-06-18T1734Z — sync HEAD to 0d47730, server still UP, docker services still gone
- `0d47730`: docs(atlas): watchdog 2026-06-17T1928Z — sync HEAD to 31aa7cf, state unchanged
- `31aa7cf`: docs(atlas): watchdog 2026-06-16T1853Z — server UP, health route /health, docker services still gone

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