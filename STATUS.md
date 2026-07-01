# Atlas Watchdog Status

> Last updated: 2026-07-02 04:40 CST (tick 2026-07-01T2040Z)
> Watchdog: atlas-watchdog-5m cron — tick 2026-07-01T2040Z

## Head
`0da3259ea6fa38324582f5a9445ad4e23c1c0c04` — local main and origin/main in sync
- Prior tick: committed STATUS.md showed stale HEAD ref (8b47516→0da3259); correcting now; state unchanged, Sprint2 still blocked on WeCom handoff
- Local has untracked runtime dirs: .atlas/, atlas-server/data/, atlas-server/logs/, status/

## Commits since last watchdog check
- `8b47516`: docs(atlas): watchdog 2026-07-01T2010Z — correct stale HEAD ref (a40b494→94089fe), state unchanged, Sprint2 still blocked on WeCom handoff
- `a40b494`: docs(atlas): watchdog 2026-06-30T1138Z — correct stale HEAD ref (b0ab3bc→013ec41), state unchanged, Sprint2 still blocked on WeCom handoff
- `42e6035`: docs(atlas): watchdog 2026-06-27T2226Z — correct stale HEAD ref (aca1b66→fc90f73), state unchanged, Sprint2 still blocked on WeCom handoff
- `fc90f73`: docs(atlas): watchdog 2026-06-27T1556Z — correct stale HEAD ref (019093c→aca1b6), state unchanged, Sprint2 still blocked on WeCom handoff
- `aca1b66`: docs(atlas): watchdog 2026-06-27T1456Z — correct stale HEAD ref (66f58d8→019093c), state unchanged, Sprint2 still blocked on WeCom handoff
- `019093c`: docs(atlas): watchdog 2026-06-27T0656Z — correct stale HEAD ref (71045f5→66f58d8), state unchanged, Sprint2 still blocked on WeCom handoff
- `66f58d8`: docs(atlas): watchdog 2026-06-27T0255Z — correct stale HEAD ref (39cdc84→71045f5), state unchanged, Sprint2 still blocked on WeCom handoff
- `d47db12`: docs(atlas): watchdog 2026-04-06 01:53 — atlas-server stopped, needs manual restart

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