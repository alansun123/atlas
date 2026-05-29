# Atlas Watchdog Status

> Last updated: 2026-05-29 21:12 CST (tick 2026-05-29T1312Z)
> Watchdog: atlas-watchdog-5m cron — tick 2026-05-29T1312Z

## Head
`59f5957f5eecae53663622ceade43b68517857f5` — local HEAD and origin/main are in sync; local is clean, no uncommitted changes

## Commits since last watchdog check
- `59f5957f` (origin/main): sync commits applied; local and origin are now aligned
- No new development commits since last tick

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
- ❌ **atlas-server is DOWN** — no atlas-server process running
- Docker services: PostgreSQL and Redis containers have **Exited (255)** — stopped ~1 hour ago
  - `openclaw-mission-control-db-1` (PostgreSQL 16-alpine): Created state
  - `openclaw-mission-control-redis-1` (Redis 7-alpine): Exited ~1h ago
  - Only `searxng` container is currently running on :8080
- Backend cannot function without PostgreSQL and Redis

## Reference Docs
- `docs/sprint2-wecom-kickoff.md` — Sprint 2 scope and kickoff plan
- `docs/tech-lead-sprint2-source-of-truth-2026-03-12.md` — acceptance criteria
- `docs/qa-wecom-auth-watchdog-2026-03-12.md` — WeCom auth findings