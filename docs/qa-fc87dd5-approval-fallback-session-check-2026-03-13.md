# QA Findings — fc87dd5 approval fallback + session failure check (2026-03-13)

Target commit: `fc87dd5` (`atlas-web: expose approval fallback and session failures`)

## Verdict

**Partial pass / one regression gap found.**

The commit materially improves truthfulness for **approval list/detail read paths**:
- list/detail responses now explicitly label `api` vs `mock`
- fallback notices explain that mock data is not real integration evidence
- 401/403 on list/detail fetch clears local session and surfaces an explicit session-expired message when fallback is off
- detail actions stay disabled when the page is showing fallback/mock detail

However, the commit does **not** yet apply the same session-guard/error-truthfulness to **approval actions** (`approve` / `reject`) on the detail page. That leaves a narrow but real regression gap: an auth/session failure during the action path is still handled like a generic detail-page failure instead of a truthful action failure with session cleanup.

## Evidence

### 1) Read-path truthfulness: improved and QA-acceptable
Reviewed files:
- `atlas-web/src/api/atlas.ts`
- `atlas-web/src/views/approval/ApprovalListView.vue`
- `atlas-web/src/views/approval/ApprovalDetailView.vue`
- `atlas-web/src/components/common/IntegrationNotice.vue`

Observed in `atlas-web/src/api/atlas.ts`:
- `getErrorMessage()` maps 401/403 to `当前登录会话已失效（...）。请重新登录后再试。`
- `handleFallbackableError()` calls `clearSession()` for 401/403
- `fetchApprovalsWithFallback()` now returns:
  - `source: 'api'` + positive real-API notice when successful
  - `source: 'mock'` + fallback/session-failure notice when fallback is enabled
  - explicit thrown user-facing error when fallback is disabled
- `fetchApprovalDetailWithFallback()` now behaves the same way for detail fetches

Observed in approval views:
- list/detail render an `IntegrationNotice` based on the returned `source`
- detail action handlers early-return unless `detail.source === 'api' && detail.status === 'pending'`
- therefore fallback/mock detail does **not** allow fake approval writes

Assessment:
- For the targeted list/detail **read** flows, the commit does what it claims.

### 2) Regression gap: detail action failures are still not session-guarded in fc87dd5
Observed in `atlas-web/src/api/atlas.ts` at `fc87dd5`:
- `approveApproval()` and `rejectApproval()` still call `apiRequest(...)` directly
- they do **not** call `handleFallbackableError()`
- so a 401/403 during approve/reject does **not** clear the local session in this commit

Observed in `atlas-web/src/views/approval/ApprovalDetailView.vue` at `fc87dd5`:
- a single `error` ref is used for both load failure and action failure
- `handleApprove()` / `handleReject()` set that same `error`
- template uses `v-else-if="error"` to render `详情加载失败`

Impact:
- if approve/reject fails due to expired auth/session, the page can fall into a **detail-load-failed** state rather than a truthful **approval action failed / session expired** state
- the session is not cleared on that mutation failure path in `fc87dd5`
- this weakens the commit claim around “session failures” because only the read path was covered

This gap appears to be addressed later by `61b0315` (`fix(web): make auth fallback states truthful`), which introduced mutation session guards and separated `loadError` vs `actionError`.

## Regression assessment

- **No build/type regression found** for the commit scope.
- **Functional gap found** on approval-detail action failure handling.
- Therefore: **not a full QA pass for the broader “session failures” claim**, but **acceptable for list/detail read-path truthfulness specifically**.

## Checks run

- Source review of the exact changed files in `fc87dd5` ✅
- `cd atlas-web && npm run build` on the current branch (which still contains the approval-list/detail truthfulness changes) ✅

## Notes

I did not perform a broad end-to-end retest because the request called for minimum targeted verification. The finding above is based on direct code-path inspection of `fc87dd5` and is strong enough to classify the mutation/session-handling gap without a full environment-backed approval run.
