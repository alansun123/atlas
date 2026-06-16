# Atlas Watchdog Status

> Last updated: 2026-06-17 00:23 CST (tick 2026-06-16T1623Z)
> Watchdog: atlas-watchdog-5m cron — tick 2026-06-16T1623Z

## Head
`397ca3a4bc863880d8ab91cecbe2a5af0308aae2` — local HEAD and origin/main are in sync; local has untracked runtime dirs (.atlas/, atlas-server/data/, atlas-server/logs/, status/)
- Prior tick (2026-06-11T0142Z) referenced `4d20a98`; HEAD advanced +1 self-commit since then (`52cbef7` watchdog timestamp refresh)

## Commits since last watchdog check
- `397ca3a`: docs(atlas): watchdog 2026-06-12T1336Z — server UP, health route /health, docker services still gone
- `e8e01ed`: docs(atlas): watchdog 2026-06-12T1306Z — server UP, health route /health, docker services still gone

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