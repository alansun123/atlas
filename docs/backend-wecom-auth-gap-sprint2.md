# Atlas Sprint 2 Backend Gap Note: WeCom OAuth + Local User Mapping

_Last updated: 2026-03-12_

## Scope

This note is intentionally **backend-only** and grounded in the current `atlas-server` codebase.

Goal: define the **remaining backend acceptance scope** for Sprint 2 real WeCom login so the team can finish environment-backed auth acceptance without reopening already-landed Sprint 1 / approval hardening work.

Out of scope for this slice:
- full employee directory sync
- leave/approval WeCom sync completion
- frontend UX redesign
- broad persistence refactor across all modules

---

## 1. Current backend reality (from code)

### 1.1 Auth/session model today

Current files:
- `atlas-server/src/middlewares/auth.js`
- `atlas-server/src/modules/auth/index.js`
- `atlas-server/src/data/mock-db.js`
- `atlas-server/src/app.js`

Observed behavior:
- `attachUser` resolves current user from either:
  - `Authorization: Bearer <userId>`
  - `x-mock-user-id: <userId>`
- token is not signed, not encrypted, and not stateful; it is just a numeric local user id.
- `POST /api/auth/mock-login` returns `accessToken = String(user.id)`.
- `POST /api/auth/wework/callback` is no longer planning-wise "placeholder-only"; current repo reality already includes a real-auth-first callback direction plus executable acceptance probing, but real-environment acceptance is still pending.
- `GET /api/auth/me` still remains part of the auth acceptance chain and must be verified in a real environment after callback and refresh.
- `POST /api/auth/logout` still needs to behave deterministically as part of acceptance evidence.

### 1.2 User model today

Current mock users already contain:
- `id`
- `weworkUserId`
- `name`
- `mobile`
- `role`
- `status`
- `permissions`
- `primaryStoreId`

That means the current in-memory model is already close enough to support a first-wave mapping strategy:
- external identity key: `weworkUserId`
- local authorization source: `role`, `permissions`, `primaryStoreId`, `status`

### 1.3 RBAC behavior today

RBAC is currently driven by:
- `req.user.role`
- `req.user.permissions`
- store ownership checks in business routes

This is good news: Sprint 2 does **not** need a role-system rewrite. It mainly needs a trustworthy way to populate `req.user` from WeCom identity.

---

## 2. Main remaining gaps blocking real-environment WeCom acceptance

### Gap A: real WeCom code -> user identity exchange still lacks environment-backed acceptance

Still to prove in a real environment:
- the chosen WeCom `code` exchange path works against the actual tenant/app config
- returned WeCom user identity matches expected mapping inputs
- expired / invalid code branches are evidenced, not just assumed from stub behavior

Impact:
- until acceptance runs against a real environment, `/api/auth/wework/callback` is not fully accepted even if the integration skeleton exists

### Gap B: real backend login state still needs real-run proof

Acceptance still needs evidence for:
- signed JWT or server-session behavior in the target environment
- auth middleware verification on real callback-issued login state
- token issuance / expiry behavior under refresh and invalid-session cases

Impact:
- frontend acceptance should not assume backend auth is fully proven until those real-run checks are captured

### Gap C: no explicit pending-access state

Frontend/docs already expect `/pending-access`, but backend currently has no real notion of:
- WeCom identity recognized but not mapped to an active local user
- mapped user exists but lacks role/store access
- disabled/inactive user blocked from normal entry

Impact:
- callback cannot distinguish login success vs recognized-but-unprovisioned vs blocked user

### Gap D: no auth-specific persistence/config boundary

Missing today:
- environment config for `WECOM_CORP_ID`, `WECOM_AGENT_ID`, `WECOM_SECRET` (or the exact credential set chosen)
- repository/persistence source for local user lookup beyond in-memory arrays
- optional auth event/log table or at least structured auth logging

Impact:
- cannot move from demo-only to stable multi-environment auth behavior

### Gap E: logout is not real

Missing today:
- if JWT-only: clear contract that logout is client-side token discard
- if session/refresh-token based: invalidation path

Impact:
- backend contract is undefined once real auth exists

---

## 3. Recommended first implementation slice

### Recommendation

Implement **one narrow vertical slice**:

1. real `POST /api/auth/wework/callback`
2. signed backend token issuance
3. `GET /api/auth/me` on signed token
4. pending-access response for unmapped/inactive users
5. keep all non-auth business modules unchanged

This is the highest-signal slice because it unlocks real login without forcing full database migration first.

---

## 4. Proposed backend contract for Sprint 2 first wave

### 4.1 `POST /api/auth/wework/callback`

Input:
```json
{ "code": "CODE_FROM_WECOM" }
```

Backend flow:
1. validate `code` present
2. call WeCom auth API to exchange `code` for external identity (`weworkUserId`)
3. lookup local Atlas user by `weworkUserId`
4. branch by lookup result:
   - active mapped user -> issue signed token and return normal session payload
   - no local mapping -> return pending-access payload
   - local user exists but `status !== active` -> return pending-access or blocked payload
   - local user exists but has no usable role/store scope -> return pending-access payload

Recommended response shapes:

#### A. Active mapped user
```json
{
  "accessToken": "<signed-token>",
  "tokenType": "Bearer",
  "expiresIn": 7200,
  "loginType": "wecom",
  "user": { ... }
}
```

#### B. Pending access
```json
{
  "accessToken": null,
  "tokenType": "Bearer",
  "expiresIn": 0,
  "loginType": "wecom",
  "pendingAccess": true,
  "user": {
    "weworkUserId": "external_user_xxx",
    "name": "企微返回姓名或空"
  }
}
```

Notes:
- For first wave, returning HTTP `200` with `pendingAccess: true` is usually easiest for frontend branching.
- Do **not** silently map unknown WeCom users to a fallback local account.

### 4.2 `GET /api/auth/me`

Use signed token middleware instead of numeric mock bearer parsing.

Recommended behavior:
- valid signed token + active mapped user -> return current user
- valid token but user now inactive/unmapped -> return auth failure or pending-access shaped failure
- missing/invalid token -> `401`

### 4.3 `POST /api/auth/logout`

For minimum slice, define logout as:
- stateless token mode: backend returns success, frontend deletes token
- document clearly that server-side invalidation is not yet implemented

That is acceptable for first wave if token TTL is short.

### 4.4 keep mock login temporarily

Keep:
- `POST /api/auth/mock-login`

But mark it as demo/dev-only. Do not let its behavior leak into production paths.

---

## 5. Middleware/session implications

### Current middleware
`src/middlewares/auth.js` currently:
- parses plain numeric bearer token
- loads user directly from `db.users`

### Minimum refactor needed
Split auth concerns into two layers:

1. **token extraction/verification**
   - read `Authorization: Bearer <token>`
   - verify signed token
   - extract local `userId` and `weworkUserId` claims

2. **user attachment**
   - lookup current local user
   - attach `req.user`
   - preserve current downstream shape so existing routes keep working

Recommended transitional behavior:
- in development, optionally allow mock numeric token fallback behind explicit env flag
- in normal Sprint 2 real-login mode, prefer signed token path first

This reduces churn because `requireAuth` and `requirePermission` can stay mostly unchanged.

---

## 6. Persistence/data model minimums

### 6.1 Good enough for first wave

If the team wants the smallest possible step, first wave can still use the current in-memory source **for local user lookup only**, as long as:
- lookup key is `weworkUserId`
- no fallback-user hack remains
- pending-access is explicit
- token is signed

That said, this is only acceptable for short-lived internal integration testing.

### 6.2 Better minimum for stable Sprint 2

Persist at least `users` in a real datastore with these auth-relevant columns:
- `id`
- `wework_user_id` unique
- `name`
- `mobile`
- `role`
- `status`
- `primary_store_id`
- `last_login_at`
- timestamps

Optional but high-value additions:
- `auth_source` / `created_from`
- `last_login_ip`
- `last_login_user_agent`

### 6.3 Pending-access support

A separate table is not strictly required for first wave.

Minimum workable rule:
- if no active mapped local user exists for the WeCom identity, callback returns `pendingAccess: true`

If auditability matters soon, add lightweight auth logging rather than a full pending-access application workflow first.

---

## 7. Config required

Minimum env/config set:
- `WECOM_CORP_ID`
- `WECOM_AGENT_ID`
- `WECOM_SECRET` (or whichever secret is required by chosen WeCom login flow)
- `JWT_SECRET`
- `JWT_EXPIRES_IN` (default `7200s`)
- `ALLOW_MOCK_AUTH` (`true/false`, default `false` outside local dev)

Also needed, but may belong to frontend/deploy config rather than app code:
- callback URL / redirect domain alignment with WeCom app settings

---

## 8. Pending-access behavior recommendation

Because frontend already has `/pending-access`, backend should provide a stable rule set.

### Treat as pending access when
- WeCom identity exists, but no local Atlas user matches `weworkUserId`
- local user exists, but `status !== 'active'`
- local user exists, but no role is assigned
- local user exists, but no usable store scope is assigned for role-dependent access

### Do not treat as successful login when
- local mapping is absent
- role/permission/store scope is incomplete

### Suggested response contract
On callback success but not provisioned:
- `code = 0`
- `data.pendingAccess = true`
- `data.accessToken = null`
- include minimal identity echo for UI display

This keeps frontend routing simple while avoiding fake authenticated sessions.

---

## 9. Low-risk file-level implementation plan

### Files likely to change first
- `atlas-server/src/modules/auth/index.js`
- `atlas-server/src/middlewares/auth.js`
- `atlas-server/src/app.js` (only if auth headers/CORS or env bootstrapping need small updates)

### Files likely to be added
- `atlas-server/src/services/wecom-auth.js` (WeCom code exchange client)
- `atlas-server/src/services/token.js` (JWT sign/verify helpers)
- optionally `atlas-server/src/config/auth.js` (env parsing)

### Files that can remain unchanged in first wave
- schedules / approvals / leaves / stores business logic
- current RBAC checks, as long as `req.user` shape remains compatible

---

## 10. Risks / blockers / dependencies

### External dependencies
- real WeCom test tenant/app configuration
- valid callback domain and environment routing
- confirmed choice of WeCom login flow and exact exchange API

### Product/ops decisions still needed
- source of truth for user provisioning: manual DB insert vs HR sync vs admin creation
- pending-access handling: silent waiting page only, or audit/log record too
- token mode: JWT-only now vs access+refresh later

### Technical risks
- if local users remain memory-only, server restart invalidates realistic auth behavior
- if mock numeric bearer fallback stays enabled too broadly, real auth can be bypassed
- if `role` naming is not normalized (`operation_manager` vs frontend `operation`), callback payload mapping must stay consistent

---

## 11. Recommended sequence

1. finalize real env / callback domain / tenant alignment
2. reserve mapped + pending-access real test identities
3. run the existing env / acceptance probe flow and capture evidence
4. verify `POST /api/auth/wework/callback` success + `pendingAccess` behavior in that real run
5. verify `GET /api/auth/me` refresh continuity and invalid-session handling
6. keep `mock-login` only as dev/demo guidance, not Sprint 2 acceptance evidence
7. only then treat any additional backend persistence/logging work as follow-up

This sequence gives the team a real login backbone without touching schedule/approval domain logic.

---

## 12. Bottom line

The current backend is structurally close to accepted first-wave WeCom auth because:
- local user records already have `weworkUserId`
- RBAC already depends on `req.user`
- the repo now has more than a placeholder-only callback posture
- frontend already anticipates callback + pending-access flow

The remaining Sprint 2 backend P0 is therefore narrower than earlier wording implied:
- real-environment code exchange acceptance
- signed login-state proof across callback + `/auth/me`
- explicit `pendingAccess` evidence
- deterministic invalid-session / logout behavior
- minimal env/config hygiene needed to execute acceptance

That should be treated as the Sprint 2 backend acceptance slice, not as a restart of backend auth from zero.
