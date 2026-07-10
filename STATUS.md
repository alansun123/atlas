# Atlas Watchdog Status

> Last updated: 2026-07-10 15:04 CST (tick 2026-07-10T0704Z)
> Watchdog: atlas-watchdog-5m cron — tick 2026-07-10T0704Z

## Head
`115c0114d3da15f7674dd5c879fe046fcec63903` — origin/main synced; server up, docker absent, Sprint2 still blocked on WeCom handoff
- Prior tick (2026-07-08T1426Z): HEAD was 3bfaaa9; this tick HEAD moved to 115c011 (prior watchdog self-correction commit), STATUS.md HEAD ref corrected from stale 3bfaaa9→115c011; state otherwise unchanged
- Local has untracked runtime dirs: .atlas/, atlas-server/data/, atlas-server/logs/, status/

## Commits since last watchdog check
- `115c011`: docs(atlas): watchdog 2026-07-08T1426Z — correct stale HEAD ref (86c1166→3bfaaa9), origin/main synced, state unchanged, Sprint2 still blocked on WeCom handoff
- `7674d5b`: docs(atlas): watchdog 2026-07-08T1055Z — correct stale HEAD ref (b61e8da→86859a3), origin/main synced, state unchanged, Sprint2 still blocked on WeCom handoff
- `86859a3`: docs(atlas): watchdog 2026-07-08T1025Z — update HEAD ref (5045425→b61e8da), origin/main synced, state unchanged, Sprint2 still blocked on WeCom handoff
- `b61e8da`: docs(atlas): watchdog 2026-07-08T0955Z — correct stale HEAD ref (e21482e→5045425), origin/main synced, state unchanged, Sprint2 still blocked on WeCom handoff
- `e21482e`: docs(atlas): watchdog 2026-07-08T0625Z — correct stale HEAD ref (c394418→e21482e), origin/main synced (local was 1 behind, pulled), state unchanged, Sprint2 still blocked on WeCom handoff
- `c394418`: docs(atlas): watchdog 2026-07-08T0355Z — correct stale HEAD ref (4af7edf→b576cd6), origin/main synced, state unchanged, Sprint2 still blocked on WeCom handoff
- `bfdfa27`: docs(atlas): watchdog 2026-07-06T1952Z — correct stale HEAD ref (8554217→c437cbd), state unchanged, Sprint2 still blocked on WeCom handoff
- `c437cbd`: docs(atlas): watchdog 2026-07-06T0653Z — update HEAD ref (a3297d4→8554217), state unchanged, Sprint2 still blocked on WeCom handoff
- `8554217`: docs(atlas): watchdog 2026-07-06T0622Z — correct stale HEAD ref (c5d43fa→a3297d4), state unchanged, Sprint2 still blocked on WeCom handoff
- `c5d43fa`: docs(atlas): watchdog 2026-07-06T0352Z — update HEAD ref (93f5c5f→991993f), state unchanged, Sprint2 still blocked on WeCom handoff
- `991993f`: docs(atlas): watchdog 2026-07-06T0222Z — update HEAD ref (56eb3bd→93f5c5f), prior tick left stale HEAD ref, state unchanged, Sprint2 still blocked on WeCom handoff
- `93f5c5f`: docs(atlas): watchdog 2026-07-06T0152Z — update HEAD ref (f603184→56eb3bd), state unchanged, Sprint2 still blocked on WeCom handoff
- `56eb3bd`: docs(atlas): watchdog 2026-07-04T1547Z — update HEAD ref (2978f1→f603184), local was behind origin/main, pulled and synced, state unchanged, Sprint2 still blocked on WeCom handoff
- `f603184`: docs(atlas): watchdog 2026-07-04T1517Z — update HEAD ref (a19c2d3→2978f1), state unchanged, Sprint2 still blocked on WeCom handoff
- `2978f1`: docs(atlas): watchdog 2026-07-04T1317Z — update HEAD ref (1473245→a19c2d3), state unchanged, Sprint2 still blocked on WeCom handoff
- `9a533eb`: docs(atlas): watchdog 2026-07-01T2110Z — correct stale HEAD ref (0da3259→47ed9f0), state unchanged, Sprint2 still blocked on WeCom handoff
- `47ed9f0`: docs(atlas): watchdog 2026-07-01T2040Z — correct stale HEAD ref (8b47516→0da3259), state unchanged, Sprint2 still blocked on WeCom handoff
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