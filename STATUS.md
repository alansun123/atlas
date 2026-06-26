# Atlas Watchdog Status

> Last updated: 2026-06-26 10:53 CST (tick 2026-06-26T0253Z)
> Watchdog: atlas-watchdog-5m cron — tick 2026-06-26T0253Z

## Head
`bf1c9eb26028c91aabf09432e2049d157ad9d5ae` — local main and origin/main in sync
- Prior tick (2026-06-26T0223Z) pushed `bf1c9eb` — watchdog self-sync, corrected stale HEAD ref (71577cc→bf1c9eb)
- Local has untracked runtime dirs: .atlas/, atlas-server/data/, atlas-server/logs/, status/

## Commits since last watchdog check
- `71577cc`: docs(atlas): watchdog 2026-06-25T2123Z — sync HEAD to 3ba030d, state unchanged, Sprint2 still blocked on WeCom handoff
- `470e523`: docs(atlas): watchdog 2026-06-23T0515Z — sync HEAD to 544d039, state unchanged, Sprint2 still blocked on WeCom handoff
- `544d039`: docs(atlas): watchdog 2026-06-20T0534Z — sync HEAD to 270de7d, state unchanged, Sprint2 still blocked on WeCom handoff
- `270de7d`: docs(atlas): watchdog 2026-06-20T0034Z — sync HEAD to 38fa575, server still UP, Sprint2 still blocked on WeCom handoff
- `38fa575`: docs(atlas): watchdog 2026-06-18T2234Z — correct HEAD ref (3decd38→28f9b76), state unchanged
- `28f9b76`: docs(atlas): watchdog 2026-06-18T1804Z — sync HEAD to 3decd38, state unchanged
- `3decd38`: docs(atlas): watchdog 2026-06-18T1734Z — sync HEAD to 0d47730, server still UP, docker services still gone

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