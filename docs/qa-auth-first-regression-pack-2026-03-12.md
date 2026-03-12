# Atlas QA auth-first regression pack — 2026-03-12

## Scope

Focused regression verification on current repo state after the auth-source switch, limited to:
- WeCom auth smoke / pending-access handling
- approval detail access control
- RBAC guard coverage
- approval/state-machine guard coverage

Repo state checked:
- branch: current working branch
- HEAD: `07e65e34891b703d52c2b85a3c4c730a09d7bcdc`
- tech-lead source-of-truth reference: `cd1be33`

## Verdict

**Mock/auth-first regression PASS for the verified backend scope.**

What was verified now:
- `test:auth` passes on current repo state after a QA-harness-only fix
- `test:rbac` passes
- `test:approval-hardening` passes
- no approval-detail / RBAC / state-machine product regression was reproduced in this pass

What remains blocked:
- **real WeCom acceptance still blocked on real credentials + callback environment**
- local `check:wecom-env` still fails closed unless true acceptance env vars are present and redirect override is tightened

## Findings

### 1) Auth smoke

Command:

```bash
cd /Users/xiaomax/.openclaw/workspace/projects/atlas/atlas-server
npm run test:auth
```

Result: **PASS**

Verified behaviors from `atlas-server/test-auth-smoke.js`:
- `GET /api/auth/wework/url` returns WeCom login payload
- mapped code returns session token + `loginType=wecom`
- `/api/auth/me` works with valid token and rejects malformed token
- unmapped / inactive / unusable identities return `pendingAccess=true`
- real-mode exchange boundary works against local stubbed WeCom endpoints
- mock login still works in stub mode

Evidence path:
- `atlas-server/test-auth-smoke.js`

### 2) Approval detail / RBAC / state-machine regression

Commands:

```bash
cd /Users/xiaomax/.openclaw/workspace/projects/atlas/atlas-server
npm run test:rbac
npm run test:approval-hardening
```

Result: **PASS**

Verified behaviors:
- employee cannot create schedule batches
- manager can submit approval
- non-approver manager cannot approve
- assigned ops approver can approve
- publish path works only after approval transition
- duplicate approval creation is blocked
- unauthorized employee cannot open approval detail
- authorized manager can open approval detail
- resolved approval cannot be re-rejected

Evidence paths:
- `atlas-server/test-rbac-smoke.js`
- `atlas-server/test-approval-hardening-smoke.js`
- prior preserved QA artifact: `docs/qa-approval-hardening-retest-2026-03-12.md`

### 3) Real-env readiness check

Command run locally:

```bash
cd /Users/xiaomax/.openclaw/workspace/projects/atlas/atlas-server
ATLAS_WECOM_AUTH_MODE=real \
WECOM_CORP_ID=ww-test-corp \
WECOM_AGENT_ID=1000001 \
WECOM_SECRET=real-mode-secret \
WECOM_REDIRECT_URI=http://127.0.0.1:3999/auth/wework/callback \
npm run check:wecom-env
```

Result: **expected fail-closed**

Observed blockers from script output:
- `ATLAS_AUTH_TOKEN_SECRET` missing
- `ATLAS_WECOM_ALLOW_REDIRECT_OVERRIDE` still effectively enabled for this local run
- no real tenant/callback evidence captured yet

Evidence path:
- `atlas-server/scripts/check-wecom-env.js`
- acceptance contract: `docs/backend-wecom-real-auth-acceptance.md`

## QA gap found and fixed

### Test harness regression

Issue found during retest:
- `npm run test:auth` initially failed because the smoke test still tried to do direct `db.users = ...` style cleanup assumptions from the older store contract
- current store rejects direct array replacement of `db.users`

QA-only fix applied:
- updated `atlas-server/test-auth-smoke.js` to create temporary QA users through store helpers and clean them up directly from the local test DB

Impact:
- this was a **test harness regression**, not a reproduced product/auth bug

## Exact repro for the harness issue

Initial failing command:

```bash
cd /Users/xiaomax/.openclaw/workspace/projects/atlas/atlas-server
npm run test:auth
```

Initial failure signature:

```text
Error: Direct replacement of db.users is not supported: received array
```

Fixed by QA-only harness update in:
- `atlas-server/test-auth-smoke.js`

## Still blocked on real WeCom creds

Not verified in this pass:
- real tenant login from actual WeCom app entry
- real callback success with mapped active user
- real callback pendingAccess with unmapped/inactive identity
- `/api/auth/me` continuity after a real-tenant callback-issued token
- end-to-end business regression under real-auth identities in browser

## Bottom line

- **Verified now:** mock/auth-first backend regression coverage for auth smoke, approval detail access, RBAC guards, and approval state-machine guards
- **Not yet verifiable honestly:** real WeCom acceptance without true `CorpID / AgentID / Secret`, callback alignment, and evidence capture
- **Concrete still-reproducible product bug in this pass:** none
- **Concrete issue found:** stale QA harness in `test-auth-smoke.js` (fixed)
