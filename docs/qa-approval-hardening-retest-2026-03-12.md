# Atlas approval hardening retest — 2026-03-12

## Verdict

**PASS for the backend hardening scope in `de1049b`.**

Retest preserved on current `main` (`0a81da6`) confirms the approval-detail RBAC and duplicate/state guards still behave as intended in the mock API layer for the covered personas:
- submitter / store manager: allowed to open approval detail
- current approver / ops manager: allowed to open detail and approve
- unauthorized same-store employee: forbidden
- unauthorized other-store manager: forbidden
- unauthorized other-store employee: forbidden

No new blocker found in the approval flow covered by this retest.

---

## Scope retested

Focused on `atlas-server` approval flow after `de1049b`:
- `GET /api/approvals/:id` access control
- `POST /api/schedules/batches/:id/submit-approval` duplicate/reuse behavior
- `POST /api/approvals` duplicate pending guard
- `POST /api/approvals/:id/approve` resolved/state mismatch guards
- forbidden action checks for non-approver / non-permitted roles

Repo / commit tested:
- branch: `main`
- HEAD (current retest-preserved artifact): `0a81da693f6dd3a50ed8e3c2ab3fa63d56f8b492`
- original hardening change under test: `de1049bf72ff8e6b0b3a15b54a18aa64782a3770`

---

## What passed

### 1) Existing smoke coverage still passes
- `npm run test:rbac` ✅
- `npm run test:approval-hardening` ✅

### 2) Approval detail RBAC
Using mock users from `src/data/mock-db.js`:
- user `101` (`manager`, store 1, submitter via `submit-approval`) → **200** on approval detail
- user `201` (`operation_manager`, current approver) → **200** on approval detail
- user `102` (same-store employee) → **403 / code 4004**
- user `203` (other-store manager) → **403 / code 4004**
- user `204` (other-store employee) → **403 / code 4004**

### 3) Duplicate / state guards
- repeated `submit-approval` on the same pending batch returns **200** with `reused=true` and the same `approvalId`
- `POST /api/approvals` against a batch that already has a pending approval returns **409 / code 4002`
- store manager cannot approve directly; request is blocked at permission middleware with **403 / code 2003** (`approval:action` missing)
- assigned approver can approve pending approval → **200**, batch becomes `approved`
- approved batch cannot be re-submitted → **409 / code 1003**
- resolved approval cannot be rejected again → **400 / code 4002**
- forced stale approval + batch status `draft` triggers explicit batch-state guard on approve → **409 / code 4002**

---

## Evidence snapshot

Targeted role/state retest output:

```json
{
  "ok": true,
  "results": [
    {
      "name": "submit-approval by store manager succeeds",
      "approvalId": 90002,
      "responseStatus": 200
    },
    {
      "name": "submitter/store manager detail access",
      "responseStatus": 200,
      "code": 0
    },
    {
      "name": "current approver detail access",
      "responseStatus": 200,
      "code": 0
    },
    {
      "name": "same-store employee detail forbidden",
      "responseStatus": 403,
      "code": 4004
    },
    {
      "name": "other-store manager detail forbidden",
      "responseStatus": 403,
      "code": 4004
    },
    {
      "name": "other-store employee detail forbidden",
      "responseStatus": 403,
      "code": 4004
    },
    {
      "name": "repeat submit-approval reuses pending approval",
      "responseStatus": 200,
      "reused": true
    },
    {
      "name": "POST /api/approvals blocks duplicate pending approval",
      "responseStatus": 409,
      "code": 4002
    },
    {
      "name": "store manager cannot approve without approval:action permission",
      "responseStatus": 403,
      "code": 2003
    },
    {
      "name": "assigned approver can approve pending approval",
      "responseStatus": 200,
      "batchStatus": "approved"
    },
    {
      "name": "approved batch cannot be resubmitted",
      "responseStatus": 409,
      "code": 1003
    },
    {
      "name": "resolved approval cannot be rejected again",
      "responseStatus": 400,
      "code": 4002
    },
    {
      "name": "approve blocked when batch state is not pending_approval",
      "responseStatus": 409,
      "code": 4002,
      "batchStatus": "draft"
    }
  ]
}
```

---

## Commands run

```bash
cd /Users/xiaomax/.openclaw/workspace/projects/atlas/atlas-server
npm run test:rbac
npm run test:approval-hardening

cd /Users/xiaomax/.openclaw/workspace/projects/atlas
node <<'JS'
process.env.ATLAS_AUTH_TOKEN_SECRET = 'test-secret';
const { app } = require('./atlas-server/src/app');
const { db } = require('./atlas-server/src/stores');
// targeted role/detail/state retest against an ephemeral local server on current main
JS
```

---

## Remaining gaps

Not covered in this pass:
- browser/UI rendering of the approval detail page for each persona
- frontend handling of the exact 403/409 error codes/messages from these backend paths
- multi-step approval chains beyond the current single `currentApproverId` mock model

These are follow-up items, not blockers for the backend hardening commit.

---

## Follow-up needed

- **Backend:** no follow-up required for the tested `de1049b` scope
- **Frontend:** optional verification only — one UI-level pass to confirm forbidden-detail / forbidden-action states render cleanly
