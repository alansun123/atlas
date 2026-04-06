# Atlas Watchdog Status

> Last updated: 2026-04-06 15:27 UTC / 23:27 CST
> Watchdog: atlas-watchdog-5m cron

## Head
`fc87dd5` ("atlas-web: expose approval fallback and session failures") — 2026-03-12 19:55 CST on `main`

## Commits since last watchdog check
- **10 new commits** landed on `main` (all 2026-03-12), tracked on a diverged branch (`techlead/watchdog-followup-20260312` ↔ `main`)
- Key commits:
  - `b06bff4` feat(web): make wecom auth flow real-auth-first
  - `8f9e7bd` feat(atlas-server): add signed auth and wecom callback flow
  - `884074b` feat(atlas-server): add wecom auth url and real exchange boundary
  - `9f07164` docs(qa): add sprint 2 wecom auth watchdog findings
  - `eb99e95` atlas-web: default auth flows to real API data
  - `de1049b` feat(atlas-server): harden approval workflow state
  - `fc87dd5` atlas-web: expose approval fallback and session failures
- Full diff vs `e4ffa21` (last watchdog tracking point): 10 commits on main

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
- **atlas-server is not running** (no process found)
- `techlead/watchdog-followup-20260312` branch had note: "atlas-server stopped, needs manual restart"
- If testing, start with: `cd atlas-server && npm start` (or see project docs)

## Reference Docs
- `docs/sprint2-wecom-kickoff.md` — Sprint 2 scope and kickoff plan
- `docs/tech-lead-sprint2-source-of-truth-2026-03-12.md` — acceptance criteria
- `docs/qa-wecom-auth-watchdog-2026-03-12.md` — WeCom auth findings
