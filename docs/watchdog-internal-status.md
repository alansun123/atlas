# Atlas Watchdog Status

**Last Check:** 2026-03-13 16:58 GMT+8

## Status: Sprint 1 COMPLETED ✅ — Waiting on WeCom Credentials

### Stable Watchdog Anchor
- Treat this file as a posture/blocker summary, **not** as a repo-head mirror.
- Watchdog/doc-only refresh commits do not by themselves create a new worker trigger.
- Use the latest **relevant implementation** commit plus current blocker state as the freshness signal.

### Milestone Reached (2026-03-12)
- Mock E2E retest passed all 5 steps
- Approval detail bug fixed
- RBAC/state machine hardening complete
- WeCom integration plan documented
- Frontend fallback/masking warnings tightened on approval and schedule views

### Current State
- No active Atlas subagents
- Repo branch: `techlead/watchdog-followup-20260312`
- Current check confirms `main` remains ahead on implementation (`fc87dd5 atlas-web: expose approval fallback and session failures`), while this watchdog branch remains doc-only tracking
- Latest relevant implementation commits:
  - `61b0315 fix(web): make auth fallback states truthful`
  - `382d4a8 feat(atlas-server): add auth request tracing logs`
- Current repo posture: later repo-head movement may be watchdog/planning doc maintenance only and is not, by itself, a stale-status trigger
- Working tree delta at check time: clean
- Real WeCom auth remains blocked in live acceptance until real env is provided; redirect override now defaults OFF and should be enabled only for explicit local smoke tests
- Required real-acceptance env remains unavailable in the shared acceptance environment: `ATLAS_AUTH_TOKEN_SECRET`, `WECOM_CORP_ID`, `WECOM_AGENT_ID`, `WECOM_SECRET`, `WECOM_REDIRECT_URI`

### Watchdog Assessment
- Sprint 1 closure work remains closed; do not reopen approval-detail / RBAC / state-machine as active implementation scope without a fresh failing regression
- QA auth-first retest checklist is ready and aligned with Sprint 2 auth-first order
- WeCom integration planning is documented in `docs/WECOM_INTEGRATION_PLAN.md` and related Sprint 2 source-of-truth docs; the plan is now aligned as a current-state acceptance document rather than an open implementation checklist
- Redirect-override URLs are no longer a default/shared path and must not be treated as a worker trigger by themselves
- No worker spawn needed until real credentials / callback environment arrive, or a new failing regression appears

### Verified Evidence This Tick
- `docs/qa-auth-first-retest-checklist.md` still marks real-mode acceptance as blocked on credentials
- `docs/qa-auth-truth-retest-2026-03-13.md` records PASS for the auth-truthfulness retest on `61b0315`, covering callback stale-session clearing, pending-access non-login wording, and `/home` mock/fallback warning clarity
- `docs/WECOM_INTEGRATION_PLAN.md` exists and remains the integration plan reference
- Backend and docs reflect the current auth-first baseline; latest backend implementation delta is `382d4a8 feat(atlas-server): add auth request tracing logs`, which improves real-env acceptance evidence capture without reopening Sprint 1 scope
- Active Atlas subagents this tick: none
- Latest relevant implementation commits remain `61b0315` (frontend auth truthfulness), `382d4a8` (backend tracing), and repo `main` currently carries later UI fallback/session-failure exposure work at `fc87dd5`
- Working tree delta at check time was clean
- No fresh failing regression or new env credentials were found this tick, so no role worker was respawned

### Next Trigger
Spawn workers only if one of the following changes:
1. Real WeCom credentials / callback environment arrive
2. A new failing regression appears in approval detail / RBAC / state machine / fallback masking
3. Scope expands beyond current Sprint 2 auth acceptance plan
