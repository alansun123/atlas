# Atlas Tech Lead kanban reconcile — 2026-03-14

## Goal
Reconcile shared Kanban status with current Atlas repo truth, so stale planning tickets do not accidentally reopen already-closed Sprint 1 work.

## Repo truth confirmed
- Sprint 1 mock MVP closure is complete (`SPRINT1.md`, `docs/qa-final-mock-retest-2026-03-12.md`)
- approval-detail bug / RBAC / state-machine hardening are closed implementation scope and only require regression verification after real-auth identity switch (`docs/tech-lead-sprint2-source-of-truth-2026-03-12.md`)
- deeper mock/auth-first regression remains PASS on current baseline (`docs/qa-deeper-mock-regression-2026-03-13.md`)
- real WeCom acceptance is still externally blocked by env readiness, not by a new repo-side implementation gap (`docs/backend-wecom-real-acceptance-handoff-2026-03-13.md`, `docs/backend-wecom-env-owner-preflight-checklist-2026-03-13.md`)

## Kanban corrections applied
Updated shared Kanban entries to match repo truth:
- `atlas-prd-v2-review` -> `done`
- `atlas-tech-design-v1` -> `done`
- `atlas-ia-blueprint` -> `done` (was stale failed)
- `atlas-api-split` -> `done`
- `atlas-db-mapping` -> `done` (was stale failed)
- `atlas-scrum-rituals` -> `done` (was stale failed)
- `atlas-qa-acceptance` -> `blocked` for real-env acceptance only

Added new next-step ticket:
- `atlas-wecom-real-env-handoff` -> `blocked`

## Why the new blocked ticket exists
The remaining meaningful next step is not generic Frontend/Backend/QA work. It is a specific env-owner handoff packet:
1. real WeCom credentials
2. callback / redirect alignment
3. mapped employee / manager / operation-manager identities
4. one pending-access identity
5. backend `check:wecom-env` + `probe:wecom-acceptance`
6. QA auth-first acceptance in the same environment

## Spawn guidance
Do **not** respawn Backend / QA / Frontend from status alone.
Only respawn when either:
- real WeCom env handoff is ready, or
- a fresh failing regression appears.
