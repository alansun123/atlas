# Atlas Backend Handoff — First Real WeCom Acceptance Run

> 更新时间：2026-03-13 17:58 GMT+8  
> 角色：Tech Lead → Backend / Env Owner / QA  
> 权威 planning 文档：`docs/tech-lead-sprint2-source-of-truth-2026-03-12.md`  
> 验收合同：`docs/backend-wecom-real-auth-acceptance.md`

## 1. Why this handoff exists

Current repo planning is already aligned on one truth:
- Sprint 1 closure is done
- approval-detail / RBAC / state-machine implementation scope is closed
- frontend auth-truthfulness tightening is already landed
- backend auth contract + probe support already exist

So the next unblock is **not more auth redesign**.
The next unblock is one **real-environment, evidence-backed acceptance run** with the correct owners and artifacts prepared in advance.

This handoff turns that next run into a concrete backend/env packet.

Companion execution checklist: `docs/backend-wecom-env-owner-preflight-checklist-2026-03-13.md`

---

## 2. Scope guardrails

This handoff is intentionally narrow.

### In scope
- real WeCom env readiness
- backend probe execution
- evidence capture requirements
- QA entry conditions for the same environment
- precise owner sequencing

### Out of scope
- reopening approval-detail / RBAC / state-machine implementation
- reframing `fc87dd5` as current delivery scope
- broad persistence redesign before acceptance
- frontend UX redesign beyond already-landed auth-truthfulness work

`fc87dd5` should remain historical QA nuance only; current relevant implementation baseline is later than that.

---

## 3. Backend/env owner preflight checklist

Do not start the real acceptance run until all items below are known.

### 3.1 Required env values
Shared acceptance environment must provide:
- `ATLAS_AUTH_TOKEN_SECRET`
- `ATLAS_WECOM_AUTH_MODE=real`
- `WECOM_CORP_ID`
- `WECOM_AGENT_ID`
- `WECOM_SECRET`
- `WECOM_REDIRECT_URI`

Expected shared-env posture:
- `ATLAS_WECOM_ALLOW_REDIRECT_OVERRIDE=false`
- redirect override remains local-smoke-only, not shared acceptance evidence

### 3.2 Callback / tenant alignment
Must be confirmed before testing:
- WeCom app callback config exactly matches `WECOM_REDIRECT_URI`
- target backend/frontend callback environment is reachable from the real WeCom login flow
- same environment is used for probe evidence and QA verification

### 3.3 Identity coverage
Prepare four real identities before the run:
1. mapped active employee
2. mapped active manager
3. mapped active operation manager
4. unmapped or inactive identity for `pendingAccess`

For each identity, record ahead of time:
- human label
- expected WeCom identity
- expected Atlas mapping result
- expected final branch (`success` or `pendingAccess`)

---

## 4. Single-run execution order

## Step 1 — env readiness proof
Backend/env owner runs:

```bash
cd atlas-server
npm run check:wecom-env
```

Required result:
- `effectiveMode=real`
- `READY_FOR_REAL_AUTH_ENV_CHECK=true`

If this fails, stop. Do not treat later browser/page checks as partial acceptance.

## Step 2 — probe-backed backend evidence
Backend/env owner runs:

```bash
cd atlas-server
ATLAS_BACKEND_BASE_URL=https://<target-backend-base-url> \
ATLAS_WECOM_SUCCESS_CODE='<real mapped active-user code>' \
ATLAS_WECOM_PENDING_CODE='<real unmapped-or-inactive-user code>' \
npm run probe:wecom-acceptance
```

Required outcome:
- login URL evidence captured
- success callback evidence captured
- `/api/auth/me` continuity captured
- pending-access evidence captured
- invalid-session evidence captured

### Step 3 — tracing/log evidence bundle
For the same run, backend must preserve:
- probe stdout/stderr log
- request tracing snippets associated with the callback attempt(s)
- timestamps for success and pending-access flows
- any error payload for invalid/expired/malformed token checks

This is now practical because tracing/log support already landed on the backend baseline.

## Step 4 — QA auth-first verification in the same environment
Only after backend evidence exists, QA runs the prepared auth-first order:
1. success-path callback
2. `pendingAccess` callback
3. `/api/auth/me` after callback
4. `/api/auth/me` after refresh/token reuse
5. missing/malformed/expired session handling
6. focused approval-detail / RBAC / state-machine regression verification under real-auth identities

Important wording:
- step 6 is regression verification only
- it is not a reopened implementation stream

---

## 5. Evidence package required for acceptance review

When backend hands off to QA / Tech Lead, the package should contain exactly these sections.

### A. Environment readiness
- target environment URL
- `npm run check:wecom-env` result
- confirmation that redirect override was not used for shared-env evidence

### B. Login URL proof
- `GET /api/auth/wework/url` response summary
- `mode=real`
- `corpId`, `agentId`, `redirectUri` match intended config

### C. Success-path proof
- mapped identity label
- callback result summary
- `accessToken` issued
- `loginType=wecom`
- `wecomMode=real`
- mapped Atlas role returned correctly

### D. Pending-access proof
- negative identity label
- callback result summary
- `pendingAccess=true`
- `accessToken=null`
- truthful `accessState`

### E. Session continuity proof
- first `/api/auth/me` result
- second `/api/auth/me` result after refresh/token reuse
- identity and role remain consistent

### F. Invalid-session proof
- missing token -> `401`
- malformed or expired token -> `401`
- if applicable, inactive user path -> `403` / `pendingAccess`

### G. Traceability
- probe command used
- timestamps
- backend tracing/log references
- commit hash of the backend being accepted

---

## 6. Exit criteria and verdict language

### Backend can say “ready for QA handoff” only when
- env readiness check passed
- real success-path evidence exists
- real pending-access evidence exists
- `/api/auth/me` continuity evidence exists
- invalid-session evidence exists
- logs/traces are attached to the same run

### Tech Lead can say “real WeCom acceptance closed” only when
- backend package above exists
- QA confirms the same environment behaves truthfully on the auth-first checklist
- no fresh regression appears in the narrow approval/RBAC/state-machine regression slice

### Tech Lead should say “still blocked” when
- secrets are missing
- callback alignment is unconfirmed
- only stub evidence exists
- QA is forced to infer truth from fallback/mock pages

---

## 7. Owner handoff summary

### Backend / env owner — next concrete action
Own the **first real acceptance evidence run** and produce the evidence package above.

### QA — enters immediately after backend package exists
Use the same environment and identities to validate auth-first truthfulness plus the narrow regression slice.

### Frontend — no default respawn from this handoff
Frontend is not the next default owner unless QA finds a fresh real-auth regression. Already-landed auth-truthfulness work should not be reopened by default.

---

## 8. Recommended next handoff

**Primary next handoff: Backend**

Reason:
- the current blocker is env-backed acceptance evidence
- the repo already has the auth contract and probe support needed
- the next missing artifact is a real backend/env evidence bundle, not another planning rewrite or frontend implementation pass
