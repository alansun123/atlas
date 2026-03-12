# Atlas QA Watchdog — Sprint 2 WeCom Auth Retest

> Date: 2026-03-12
> Scope: retest on `main` after backend commit `884074b` (`feat(atlas-server): add wecom auth url and real exchange boundary`)

## Verdict

**Previously blocked items are materially reduced. Stub/integration QA is now in good shape; real WeCom E2E QA is closer but still not fully acceptance-ready without real tenant credentials and a live callback environment.**

### Status against the prior blockers
1. **Missing `GET /api/auth/wework/url`** → **RESOLVED**
2. **Backend callback only stub/env-based, not real-capable** → **PARTIALLY RESOLVED**
   - Real-mode exchange boundary now exists and is smoke-covered.
   - Full acceptance still depends on real WeCom credentials / reachable callback environment.
3. **`atlas-server/.env.example` missing clear real WeCom env contract** → **RESOLVED**

Bottom line: **the auth contract is now coherent enough for frontend alignment and backend smoke validation.** The remaining gap is no longer “missing route / missing contract”; it is **real-environment verification**.

## What I verified

### 1) Backend auth contract
Inspected:
- `atlas-server/src/modules/auth/index.js`
- `atlas-server/src/services/wework-auth.js`
- `atlas-server/src/config/auth.js`
- `atlas-server/src/middlewares/auth.js`
- `atlas-server/test-auth-smoke.js`
- `atlas-server/.env.example`

Observed:
- `GET /api/auth/wework/url` now exists.
- URL builder returns structured metadata: `url`, `loginType`, `mode`, `configuredMode`, `corpId`, `agentId`, `redirectUri`, `scope`, `state`.
- `POST /api/auth/wework/callback` now supports:
  - signed-token login for mapped active users
  - `pendingAccess=true` for `unmapped` / `inactive` / `unusable`
  - real-mode exchange path via WeCom token + userinfo endpoints
- `GET /api/auth/me` works off signed backend tokens.
- `POST /api/auth/logout` is explicitly documented in response as stateless/non-invalidating (`tokenInvalidation: not_implemented_stateless_logout`).
- `.env.example` now clearly documents real WeCom env names and mode switching:
  - `ATLAS_WECOM_AUTH_MODE`
  - `WECOM_CORP_ID`
  - `WECOM_AGENT_ID`
  - `WECOM_SECRET`
  - `WECOM_REDIRECT_URI`
  - endpoint override envs for smoke/integration testing

### 2) Backend smoke coverage
Observed in `atlas-server/test-auth-smoke.js`:
- covers `/api/auth/wework/url`
- covers mapped active callback success
- covers `pendingAccess` branches for `unmapped`, `inactive`, `unusable`
- covers signed-token `GET /api/auth/me`
- covers failure on unknown code
- covers real-mode exchange boundary through stubbed local WeCom endpoints

Interpretation:
- This is a meaningful improvement over the prior state because the real-mode boundary is no longer just theoretical; it is executable in smoke tests.

### 3) Frontend alignment with backend contract
Inspected:
- `atlas-web/src/api/atlas.ts`
- `atlas-web/src/views/common/AuthCallbackView.vue`
- `atlas-web/src/router/index.ts`
- `atlas-web/package.json`

Observed:
- Frontend requests `/auth/wework/url` first, which now matches backend capability.
- Frontend callback posts `{ code, state }` to `/auth/wework/callback`, which is compatible with backend.
- Frontend treats `pendingAccess` / missing token / pending role as a redirect to `/pending-access`, which matches backend payload semantics.
- Frontend still keeps a fallback OAuth URL builder from env if backend URL fetch fails; this is no longer the primary dependency.

## QA-safe checks actually run

### Commands run
```bash
cd /Users/xiaomax/.openclaw/workspace/projects/atlas

git rev-parse --abbrev-ref HEAD
git rev-parse --short HEAD
git status --short

find atlas-server/src atlas-web/src -type f \( -name '*.js' -o -name '*.ts' -o -name '*.tsx' -o -name '*.jsx' \) | xargs grep -nE '/api/auth/wework/url|wework|WeCom|callback|oauth'

sed -n '1,220p' atlas-server/.env.example
sed -n '1,260p' atlas-server/src/modules/auth/index.js
sed -n '1,220p' atlas-server/src/middlewares/auth.js
sed -n '1,260p' atlas-server/src/services/wework-auth.js
sed -n '1,240p' atlas-server/src/config/auth.js
sed -n '1,220p' atlas-server/test-auth-smoke.js
sed -n '1,220p' atlas-web/src/api/atlas.ts
sed -n '1,220p' atlas-web/src/views/common/AuthCallbackView.vue
cat atlas-server/package.json
cat atlas-web/package.json

cd atlas-server && npm run test:auth
cd ../atlas-web && npm run build

cd ../atlas-server && node - <<'NODE'
process.env.ATLAS_AUTH_TOKEN_SECRET='qa-secret';
process.env.ATLAS_WECOM_AUTH_MODE='stub';
process.env.WECOM_CORP_ID='ww-qa';
process.env.WECOM_AGENT_ID='1000001';
process.env.WECOM_REDIRECT_URI='https://atlas.example.com/auth/callback';
process.env.ATLAS_WECOM_CODE_MAP=JSON.stringify({
  qa_manager:{weworkUserId:'manager_zhangsan',name:'张三'},
  qa_unmapped:{weworkUserId:'external_user',name:'外部用户'}
});
const { app } = require('./src/app');
const server = app.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const j = async (path, opts={}) => {
    const res = await fetch(base+path, opts);
    return {status: res.status, body: await res.text()};
  };
  console.log(await j('/api/auth/wework/url'));
  console.log(await j('/api/auth/wework/callback',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:'qa_manager'})}));
  console.log(await j('/api/auth/wework/callback',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:'qa_unmapped'})}));
  server.close();
});
NODE

cd ../atlas-server && node - <<'NODE'
process.env.ATLAS_AUTH_TOKEN_SECRET='qa-secret';
process.env.ATLAS_WECOM_AUTH_MODE='stub';
process.env.WECOM_CORP_ID='ww-qa';
process.env.WECOM_AGENT_ID='1000001';
process.env.WECOM_REDIRECT_URI='https://atlas.example.com/auth/callback';
process.env.ATLAS_WECOM_CODE_MAP=JSON.stringify({qa_manager:{weworkUserId:'manager_zhangsan',name:'张三'}});
const { app } = require('./src/app');
const server = app.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const login = await fetch(base+'/api/auth/wework/callback',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:'qa_manager'})});
  const loginJson = await login.json();
  const token = loginJson.data.accessToken;
  const me = await fetch(base+'/api/auth/me',{headers:{authorization:`Bearer ${token}`}});
  const logout = await fetch(base+'/api/auth/logout',{method:'POST',headers:{authorization:`Bearer ${token}`}});
  console.log('ME', me.status, await me.text());
  console.log('LOGOUT', logout.status, await logout.text());
  server.close();
});
NODE
```

## Pass / fail results

### PASS
- `atlas-server`: `npm run test:auth`
- `atlas-web`: `npm run build`
- Direct probe: `GET /api/auth/wework/url` returns `200` and a valid WeCom OAuth URL payload.
- Direct probe: mapped callback returns `200`, signed token, `loginType=wecom`, `wecomMode=stub`.
- Direct probe: unmapped callback returns `200` with `pendingAccess=true` and `accessState=unmapped`.
- Direct probe: `GET /api/auth/me` succeeds with backend-issued bearer token.
- Direct probe: `POST /api/auth/logout` returns explicit stateless logout contract.

### NON-BLOCKING
- Frontend build emits one Vite warning about `src/api/mock.ts` being both statically and dynamically imported. This is not an auth-contract blocker.
- Repo status shows untracked local file `atlas-web/.env`; I did not modify it.

### NOT VERIFIED IN THIS QA RETEST
- Real tenant WeCom login against actual `WECOM_CORP_ID / AGENT_ID / SECRET`
- Live callback redirect hosted in a reachable environment
- Real user provisioning lifecycle beyond current mock/in-memory local user source

## Remaining blockers / gaps

### 1) Real-environment acceptance gap
The backend now has a real exchange boundary, but this retest did **not** validate against an actual WeCom tenant. So the remaining blocker is:
- **owner: backend + ops**
- provide real test credentials and reachable callback environment for a true end-to-end acceptance run

### 2) Local user source is still mock/in-memory
The login contract is improved, but the local Atlas user lookup still resolves from mock data.
- This is acceptable for current integration smoke.
- It is still a gap for durable multi-environment QA / staging realism.
- **owner: backend / tech lead**

### 3) Logout remains stateless only
This is documented now, so it is no longer a surprise blocker, but it remains a limitation.
- **owner: backend** if server-side invalidation becomes a Sprint requirement

## QA conclusion

Compared with the pre-`884074b` state, the Sprint 2 auth path is in a **meaningfully better and testable** state:
- the missing backend URL endpoint is fixed
- the callback path now has a real-mode exchange boundary
- the env contract is documented
- frontend expectations are aligned with the backend contract
- smoke coverage is materially better

So the right QA label now is:

**stub/integration PASS, real WeCom E2E still pending environment-backed acceptance.**
