# Atlas Backend — Real WeCom Auth Acceptance Contract

_Last updated: 2026-03-12_

Scope: backend / ops / QA only. This file turns Sprint 2 real WeCom acceptance from a vague dependency into an executable backend checklist.

## 1. What this document is for

The backend WeCom contract is already good enough for stub/integration validation. The remaining P0 gap is **real-environment acceptance**.

This doc defines:
- the exact env contract backend expects
- the minimum evidence that counts as real-auth acceptance
- the backend-owned sequence to collect that evidence truthfully

This document does **not** reopen frontend fallback work, approval-detail work, or broader persistence migration.

## 2. Required backend env contract

`atlas-server` real-auth acceptance requires all of the following:

- `ATLAS_AUTH_TOKEN_SECRET`
- `ATLAS_WECOM_AUTH_MODE=real` (preferred for acceptance runs)
- `WECOM_CORP_ID`
- `WECOM_AGENT_ID`
- `WECOM_SECRET`
- `WECOM_REDIRECT_URI`

Optional but relevant:
- `WECOM_SCOPE` (default: `snsapi_base`)
- `WECOM_STATE` (default: `atlas`)
- `ATLAS_WECOM_ALLOW_REDIRECT_OVERRIDE=false` in shared/acceptance envs

### Fast local validation

Before attempting a real run:

```bash
cd atlas-server
npm run check:wecom-env
```

Expected result for a real acceptance environment:
- `effectiveMode=real`
- `READY_FOR_REAL_AUTH_ENV_CHECK=true`

If not, stop treating the environment as acceptance-ready.

## 3. Human-confirmed prerequisites

These items are outside code but must be known before backend claims acceptance:

1. **Redirect URI alignment**
   - WeCom app admin confirms the configured callback URL exactly matches `WECOM_REDIRECT_URI`.
2. **Reachable callback environment**
   - frontend/browser can actually return to the backend/frontend callback path used in the real flow.
3. **Known role mapping**
   - three real identities are mapped to Atlas users with known roles:
     - employee
     - manager
     - operation manager
4. **Negative-path identity**
   - one real identity is intentionally unmapped or inactive for `pendingAccess` verification.

Without those four prerequisites, real auth is still blocked by environment truth, not backend route shape.

## 4. Required evidence for real WeCom acceptance

Backend real-auth acceptance is only complete when one run captures all evidence below.

### A. Login URL evidence

Capture:
- `GET /api/auth/wework/url` response
- confirm:
  - HTTP 200
  - `loginType=wecom`
  - `mode=real`
  - `corpId`, `agentId`, and `redirectUri` match the intended app config

### B. Success-path callback evidence

Use a real mapped active identity.

Capture:
- callback request outcome for real code exchange
- response fields showing:
  - signed `accessToken`
  - `loginType=wecom`
  - `wecomMode=real`
  - correct mapped Atlas user / role

### C. Pending-access evidence

Use a real unmapped or inactive identity.

Capture:
- callback response showing:
  - HTTP 200
  - `pendingAccess=true`
  - `accessToken=null`
  - `accessState` is truthful (`unmapped` or `inactive`)

### D. Session continuity evidence

Using the success-path token, capture:
- `GET /api/auth/me` immediately after callback
- `GET /api/auth/me` again after page refresh / token reuse

Both must return the same identity and role truthfully.

### E. Invalid-session evidence

Capture at least one failure case showing the backend is observable when session/token is bad:
- missing token -> `401`
- malformed/expired token -> `401`
- mapped user later inactive/unusable -> `403` with `pendingAccess`

## 5. Suggested backend execution order

1. Run `npm run check:wecom-env`
2. Run `npm run test:auth` to verify current smoke baseline still passes
3. Probe `GET /api/auth/wework/url` in the real environment
4. Perform one real mapped-user callback run
5. Verify `GET /api/auth/me`
6. Perform one real negative-path callback run (`pendingAccess`)
7. Record exact response snippets/screenshots/log timestamps in QA/ops notes

If step 1 or step 3 fails, do not jump ahead to business-page testing.

## 6. What does NOT count as acceptance evidence

The following do **not** prove real WeCom acceptance:

- stub-mode callback success
- `npm run test:auth` alone
- homepage/dashboard rendering
- business pages showing fallback/mock data
- frontend-generated OAuth URL when backend URL fetch failed

Those can support debugging, but they are not real-environment acceptance evidence.

## 7. Current repo support

Current backend assets supporting this acceptance flow:
- `atlas-server/src/config/auth.js`
- `atlas-server/src/services/wework-auth.js`
- `atlas-server/src/modules/auth/index.js`
- `atlas-server/test-auth-smoke.js`
- `atlas-server/scripts/check-wecom-env.js`

## 8. Backend next step after this doc

Once secrets + callback environment are available, the next backend-owned step is:

**run and record one truthful real WeCom acceptance pass (success path + pendingAccess path + /auth/me continuity).**
