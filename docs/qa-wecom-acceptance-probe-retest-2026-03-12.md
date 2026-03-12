# Atlas QA Retest — WeCom acceptance probe on `techlead/watchdog-followup-20260312`

> Date: 2026-03-12
> Branch: `techlead/watchdog-followup-20260312`
> Commit under test: `02046d0`
> Scope: QA-only retest of the newly added backend WeCom acceptance probe/docs

## Verdict

**PASS for local executable QA.**

The new backend acceptance assets are now materially verified at two levels:

1. `npm run test:auth` still passes on the branch.
2. The new `npm run probe:wecom-acceptance` script is executable and passes end-to-end in an isolated local QA setup using:
   - backend `ATLAS_WECOM_AUTH_MODE=real`
   - local stubbed WeCom endpoints
   - one mapped success code
   - one unmapped/pendingAccess code

This means the repo now has a working **backend-owned executable probe** for the real-mode auth contract. What remains unverified is still the same hard boundary: **a real tenant / real callback environment / real callback codes**.

## What I verified now

### 1) New docs and scripts exist and are internally aligned
Inspected:
- `docs/backend-wecom-real-auth-acceptance.md`
- `atlas-server/README-backend.md`
- `atlas-server/scripts/check-wecom-env.js`
- `atlas-server/scripts/probe-wecom-acceptance.js`
- `atlas-server/package.json`

Verified:
- docs point to the actual npm scripts
- package.json exposes both scripts:
  - `check:wecom-env`
  - `probe:wecom-acceptance`
- probe expectations match the documented acceptance evidence:
  - login URL
  - success callback
  - `/api/auth/me` continuity
  - pendingAccess callback
  - missing-token `401`

### 2) Baseline backend auth smoke still passes
Command:
```bash
cd atlas-server
npm run test:auth
```

Result:
- `Auth smoke passed`

Interpretation:
- existing auth behavior was not regressed by the new probe/docs work

### 3) Env-readiness script behaves as documented
Command:
```bash
cd atlas-server
ATLAS_AUTH_TOKEN_SECRET=qa-secret \
ATLAS_WECOM_AUTH_MODE=real \
WECOM_CORP_ID=ww-test \
WECOM_AGENT_ID=1000001 \
WECOM_SECRET=test-secret \
WECOM_REDIRECT_URI=http://127.0.0.1:9999/auth/callback \
npm run check:wecom-env
```

Result:
- reports `configuredMode=real`
- reports `effectiveMode=real`
- reports `READY_FOR_REAL_AUTH_ENV_CHECK=true`
- warns when redirect override is enabled

Interpretation:
- script is runnable and useful as a preflight gate
- note: with local `http://127.0.0.1/...` redirect it still returns ready, which is acceptable for local smoke but is **not** real hosted-environment evidence by itself

### 4) New acceptance probe is executable in local real-mode QA
I ran the exact new probe against an isolated local backend instance on port `3910`, with:
- `ATLAS_WECOM_AUTH_MODE=real`
- local stub WeCom endpoints on port `3901`
- `ATLAS_WECOM_SUCCESS_CODE=real_manager_code`
- `ATLAS_WECOM_PENDING_CODE=real_external_code`

Command shape:
```bash
PORT=3910 \
ATLAS_AUTH_TOKEN_SECRET=qa-secret \
ATLAS_WECOM_AUTH_MODE=real \
WECOM_CORP_ID=ww-test-corp \
WECOM_AGENT_ID=1000001 \
WECOM_SECRET=real-mode-secret \
WECOM_REDIRECT_URI=http://127.0.0.1:3999/auth/wework/callback \
ATLAS_WECOM_ALLOW_REDIRECT_OVERRIDE=false \
ATLAS_WECOM_ACCESS_TOKEN_URL=http://127.0.0.1:3901/cgi-bin/gettoken \
ATLAS_WECOM_USERINFO_URL=http://127.0.0.1:3901/cgi-bin/auth/getuserinfo \
ATLAS_WECOM_USER_DETAIL_URL=http://127.0.0.1:3901/cgi-bin/user/get \
node src/app.js

ATLAS_AUTH_TOKEN_SECRET=qa-secret \
ATLAS_WECOM_AUTH_MODE=real \
WECOM_CORP_ID=ww-test-corp \
WECOM_AGENT_ID=1000001 \
WECOM_SECRET=real-mode-secret \
WECOM_REDIRECT_URI=http://127.0.0.1:3999/auth/wework/callback \
ATLAS_WECOM_ALLOW_REDIRECT_OVERRIDE=false \
ATLAS_BACKEND_BASE_URL=http://127.0.0.1:3910 \
ATLAS_ACCEPTANCE_STATE=qa-probe-state \
ATLAS_WECOM_SUCCESS_CODE=real_manager_code \
ATLAS_WECOM_PENDING_CODE=real_external_code \
npm run probe:wecom-acceptance
```

Verified from probe output:
- `GET /api/auth/wework/url` returned `200`
- login URL payload reported:
  - `loginType=wecom`
  - `mode=real`
  - expected `corpId`
  - expected `agentId`
  - expected `redirectUri`
  - expected `state`
- success callback returned `200`
- success callback issued token with:
  - `loginType=wecom`
  - `wecomMode=real`
- `/api/auth/me` succeeded twice with stable identity/role
- pending callback returned `200` with:
  - `pendingAccess=true`
  - `accessState=unmapped`
  - no access token
- missing-token `GET /api/auth/me` returned `401`
- script finished with `ACCEPTANCE_PROBE_COMPLETE=true`

## One QA note from execution

My first probe attempt failed because `ATLAS_BACKEND_BASE_URL=http://127.0.0.1:3000` hit an unrelated service already running on that port, returning an HTML `404` page from another app.

That was an environment collision, not a branch defect.
Re-running the probe on isolated port `3910` passed cleanly.

## What is now verified vs still blocked

### Now verified
- new acceptance doc exists and matches actual scripts
- `check:wecom-env` is runnable and produces meaningful readiness output
- `probe:wecom-acceptance` is not just documented — it actually works end-to-end in local QA
- probe covers the intended backend evidence chain:
  - login URL
  - success callback
  - session continuity
  - pendingAccess path
  - missing-token `401`

### Still blocked by real environment
- no verification yet against a **real WeCom tenant**
- no verification yet with **real callback codes** generated from a browser login
- no verification yet in a **reachable hosted callback environment**
- no proof yet of the real negative-path identity in the actual tenant (`unmapped` vs `inactive`) beyond local stub simulation

## Exact next QA step

Run the same probe once in the real acceptance environment, with real callback codes:

```bash
cd atlas-server
ATLAS_BACKEND_BASE_URL=https://<real-backend-base-url> \
ATLAS_WECOM_SUCCESS_CODE='<real mapped active-user code>' \
ATLAS_WECOM_PENDING_CODE='<real unmapped-or-inactive-user code>' \
npm run probe:wecom-acceptance
```

Acceptance should only be upgraded beyond local QA once that run captures:
- real `mode=real` login URL evidence
- one real mapped-user success callback
- two successful `/api/auth/me` reads with the same token
- one real pendingAccess callback
- one invalid-session `401`

## QA conclusion

**Current branch status: local executable acceptance-probe QA PASS; real-environment acceptance still BLOCKED by external tenant/callback prerequisites, not by the new probe implementation itself.**
