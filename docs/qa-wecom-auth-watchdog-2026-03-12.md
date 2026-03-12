# Atlas QA Watchdog — Sprint 2 WeCom Auth Check

> Date: 2026-03-12
> Scope: current `main` branch Sprint 2 real-auth-first kickoff state

## Verdict

**Partially blocked / not yet QA-ready for real WeCom auth.**

What is in a sane state:
- `atlas-server` auth smoke passes for the new signed-token + WeCom callback stub flow.
- `atlas-server` RBAC/state smoke passes.
- `atlas-web` builds successfully and contains the new login + callback views.

What is still blocking real-auth-first QA:
- Backend does **not** expose `GET /api/auth/wework/url` yet.
- Backend WeCom callback is still **stub/env-based**, not a real secret-backed WeCom exchange.
- Frontend can only continue the auth flow if either:
  - backend adds `/api/auth/wework/url`, or
  - frontend runtime env provides `VITE_WECOM_CORP_ID` + `VITE_WECOM_AGENT_ID` + redirect URI.
- `atlas-server` has no general `npm test` script, so repo-level default test entry is not ready.

Bottom line: **the Sprint 2 auth direction is structurally sane, but the real WeCom path is incomplete rather than broken.** Current code is suitable for stubbed QA and frontend shell validation, not for end-to-end real WeCom acceptance.

## What I verified

### 1) Package scripts / QA surfaces

#### `atlas-web/package.json`
- `npm run dev`
- `npm run build`
- `npm run preview`

#### `atlas-server/package.json`
- `npm start`
- `npm run dev`
- `npm run test:auth`
- `npm run test:rbac`

Note:
- `npm test` currently fails because no `test` script is defined.

### 2) Env examples

#### `atlas-web/.env.example`
Contains:
- `VITE_API_BASE_URL`
- `VITE_APP_BASE_URL`
- `VITE_WECOM_REDIRECT_URI`
- `VITE_WECOM_CORP_ID`
- `VITE_WECOM_AGENT_ID`
- `VITE_ENABLE_MOCK_LOGIN`

Interpretation:
- Frontend has a documented env-based fallback for constructing the WeCom OAuth URL if backend URL generation is absent.

#### `atlas-server/.env.example`
Contains only stub-oriented auth envs:
- `ATLAS_AUTH_TOKEN_SECRET`
- `ATLAS_AUTH_TOKEN_TTL_SECONDS`
- `ATLAS_WECOM_AUTH_MODE=stub`
- `ATLAS_WECOM_CODE_MAP`
- `ATLAS_WECOM_STUB_USER_ID`
- `ATLAS_WECOM_STUB_USER_NAME`

Interpretation:
- Server-side env example does **not** yet document real WeCom app credentials / secret-backed callback exchange.

### 3) Auth entrypoints inspected

#### Backend
- `atlas-server/src/modules/auth/index.js`
- `atlas-server/src/services/wework-auth.js`
- `atlas-server/src/middlewares/auth.js`
- `atlas-server/src/services/auth-token.js`

Observed behavior:
- `POST /api/auth/wework/callback` exists and issues signed access tokens for resolved identities.
- unresolved / inactive / unusable identities are handled cleanly with pending-access semantics.
- `POST /api/auth/mock-login` still exists as a fallback/demo path.
- `GET /api/auth/wework/url` is **not implemented**.
- `wework-auth.js` resolves users only via `ATLAS_WECOM_CODE_MAP`, `stub:*`, `mock:*`, or env stub user.

#### Frontend
- `atlas-web/src/views/common/LoginView.vue`
- `atlas-web/src/views/common/AuthCallbackView.vue`
- `atlas-web/src/stores/session.ts`
- `atlas-web/src/api/atlas.ts`

Observed behavior:
- Login page is now real-auth-first.
- Frontend first requests `/auth/wework/url`.
- If backend returns 404, frontend falls back to constructing the URL locally from env.
- Callback page posts `code` to `/auth/wework/callback`.
- Mock login is guarded behind `VITE_ENABLE_MOCK_LOGIN=true`.

## QA-safe validation actually run

### Backend smoke
```bash
cd atlas-server && npm run test:auth
cd atlas-server && npm run test:rbac
```
Result:
- PASS: auth smoke
- PASS: RBAC/state smoke

### Frontend build
```bash
cd atlas-web && npm run build
```
Result:
- PASS
- Non-blocking warning: `src/api/mock.ts` is both statically and dynamically imported, so chunk split optimization does not happen.

### Direct auth path probe
```bash
cd atlas-server && PORT=3110 node src/app.js
curl -i http://127.0.0.1:3110/api/auth/wework/url
curl -i -X POST http://127.0.0.1:3110/api/auth/wework/callback -H 'Content-Type: application/json' -d '{"code":"unknown_code"}'
curl -i -X POST http://127.0.0.1:3110/api/auth/wework/callback -H 'Content-Type: application/json' -d '{"code":"stub:manager_zhangsan"}'
```
Result:
- `GET /api/auth/wework/url` -> **404 Route not found**
- `POST /api/auth/wework/callback` with unknown code -> **401** with `reason=identity-not-resolved`, `mode=stub`
- `POST /api/auth/wework/callback` with `stub:manager_zhangsan` -> **200**, signed token issued, `loginType=wecom`, `wecomMode=stub`

## Blocked by missing env / secrets / implementation

### Hard blockers for real WeCom E2E QA
1. **Missing backend auth URL endpoint**
   - Frontend prefers `/api/auth/wework/url`.
   - Current backend returns 404.

2. **No real backend WeCom exchange implementation exposed yet**
   - Current backend auth service is stub/env-based only.
   - No verified real-code -> real-identity network exchange path was found.

3. **No real WeCom credential contract documented in server env example**
   - Server example does not yet show corp/app secret style configuration needed for true E2E validation.

### Soft blocker / QA ergonomics
4. **No default `npm test` script in `atlas-server`**
   - This is not a feature blocker, but it hurts predictable QA automation.

## Regression check

I did **not** find evidence that Sprint 2 auth kickoff regressed the currently committed smoke-covered backend auth/RBAC paths.

The issue is not “new flow is broken everywhere”; it is more precise:
- **stub flow works**
- **frontend shell/build works**
- **real WeCom entrypoint contract is incomplete**

## Exact handoff recommendation

Hand off back to implementation with this priority order:

1. **Add backend `GET /api/auth/wework/url`** so frontend no longer depends on fragile client-side fallback config.
2. **Implement/document the real WeCom code exchange path** in `atlas-server`, including required env names in `.env.example`.
3. **Once the above exists, rerun QA with actual test credentials** for:
   - login redirect initiation
   - callback exchange
   - mapped active user
   - unmapped user pending-access path
   - inactive/unusable user pending-access path
4. Optionally add a top-level/default test entry (`npm test`) for cleaner CI/QA invocation.

Until (1) and (2) land, this branch should be treated as **stub-valid but not real-auth acceptance-ready**.
