# Atlas QA deeper mock regression retest — 2026-03-13

Target branch: `techlead/watchdog-followup-20260312`

Target HEAD under test: `0617a10`

## Scope
A deeper repo-contained QA-only follow-up focused on the remaining mock/auth-first regression surface at current HEAD:
- auth-first assumptions
- approval-detail access control
- RBAC
- approval/state-machine behavior
- frontend truthfulness guardrails around pending access / fallback UI

This pass stays strictly separate from real WeCom acceptance. Real env-backed acceptance is still blocked by missing credentials, callback environment, and mapped test identities.

## Exact commands run
From repo root:

```bash
git rev-parse --short HEAD
cd atlas-server && npm run test:persistence
cd atlas-server && npm run test:auth
cd atlas-server && npm run test:rbac
cd atlas-server && npm run test:approval-hardening
cd atlas-server && npm run check:wecom-env
cd atlas-web && npm run build
grep -RIn "登录失败\|不能当作已登录成功\|mock / fallback\|mock/fallback\|pending access\|待开通" atlas-web/src --include='*.vue' --include='*.ts'
```

## Findings

### 1) Persistence baseline
- `npm run test:persistence` PASS
- Restart-safe mock user-id persistence remains healthy after `11eca30`.

### 2) Auth-first baseline
- `npm run test:auth` PASS
- Covered and still passing at current HEAD:
  - OAuth URL generation in stub mode
  - redirect override default-off behavior
  - mapped active-user callback success
  - `/api/auth/me` success with valid token
  - malformed token rejection
  - pending-access responses for unmapped / inactive / unusable identities
  - real-mode probe stub path
  - logout acknowledgement / request-id logging
- No fresh auth-first regression found.

### 3) RBAC + state-machine slice
- `npm run test:rbac` PASS
- Still enforces the intended narrow protections at current HEAD:
  - employee cannot create schedule batch
  - manager can submit approval for store batch
  - manager cannot approve approval
  - ops manager can approve approval
  - employee `GET /api/schedules/me` only surfaces published schedule data
  - manager publish after approval still succeeds
- No fresh RBAC or state-machine regression found.

### 4) Approval-detail access control + approval hardening
- `npm run test:approval-hardening` PASS
- Still verifies:
  - approval creation moves batch to `pending_approval`
  - duplicate approval creation is blocked
  - store mismatch is blocked
  - employee approval list is empty for unauthorized scope
  - employee cannot open approval detail (`403`)
  - manager can open scoped approval detail (`200`)
  - approve-after-approved / reject-after-approved guards still hold
- No fresh approval-detail regression found.

### 5) Frontend truthfulness guardrails
- `npm run build` PASS
- Targeted source inspection still shows the expected non-fake-success guardrails:
  - `AuthCallbackView.vue`: failure state renders `登录失败`
  - `PendingAccessView.vue`: explicitly says pending-access `不能当作已登录成功`
  - `HomeView.vue`: prominent `mock / fallback` non-acceptance warning remains present
- Build output only showed the already-known Vite chunking warning; no QA blocker surfaced from it.

### 6) Real WeCom acceptance readiness
- `npm run check:wecom-env` confirms real acceptance is still blocked in the current environment:
  - missing token secret
  - missing corp/app credentials
  - missing redirect URI
  - effective auth mode not `real`
- This is an environment blocker, not a repo regression.

## Verdict
PASS for the repo-contained deeper mock/auth-first regression retest on `0617a10`.

## Reopen decision
- **Frontend reopen:** No
- **Backend reopen:** No
- **QA follow-up before real env arrives:** No additional repo-only execution is required by this pass

## Remaining blocker
Real WeCom env-backed acceptance remains blocked by external environment readiness only:
- credentials
- callback environment
- mapped test identities

## Conclusion
Current HEAD preserves the previously closed approval-detail / RBAC / state-machine scope and does not reopen frontend/backend implementation work. The next meaningful QA execution remains the already-prepared real auth-first acceptance run once environment inputs exist.
