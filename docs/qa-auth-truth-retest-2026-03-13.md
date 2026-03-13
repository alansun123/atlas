# QA Retest — auth truthfulness (2026-03-13)

Target commit: `61b0315` (`fix(web): make auth fallback states truthful`)

## Verdict

Focused retest passed for the three stated goals: the updated auth-related fallback states are now materially more truthful and no longer present the tested failure/pending/mock states as successful business login.

## What was verified

### 1) Stale session + auth callback failure no longer looks like successful login
- Code review:
  - `atlas-web/src/views/common/AuthCallbackView.vue`
  - `handleCallback()` now calls `clearSession()` before processing the callback.
  - On callback exception it calls `clearSession()` again and renders `登录失败` instead of reusing any prior session.
- Browser retest:
  - Seeded `localStorage.atlas_session` with a fake stale logged-in session.
  - Opened `/auth/callback` without `code`.
  - Result: page showed `登录失败 / 缺少授权 code，请返回登录页重新发起企业微信登录。`
  - Confirmed `localStorage.atlas_session === null` afterward.
- Browser retest (network/API failure path):
  - Seeded stale session again.
  - Opened `/auth/callback?code=bad-code&state=test` with no backend available.
  - Result: page showed `登录失败` with fetch failure text; stale session was still cleared.
- Assessment: PASS on truthfulness. The callback page no longer preserves a stale “logged-in” appearance when callback establishment fails.

### 2) pending-access without token is clearly not a successful business login and refresh is disabled
- Code review:
  - `atlas-web/src/views/common/PendingAccessView.vue`
  - `hasSessionToken` gates refresh ability.
  - No-token branch explicitly says this page `不能当作已登录成功`.
  - Refresh button is bound with `:disabled="refreshing || !hasSessionToken"`.
- Browser retest:
  - Cleared local storage and opened `/pending-access` directly.
  - Result text included:
    - `待开通结果已确认，但当前没有可复用会话`
    - `当前页面只能说明本次企微回调结果为待开通，不能当作已登录成功。`
    - `当前为 pending-access 结果页，不代表已建立可继续访问业务页的登录态。`
  - DOM check confirmed refresh button `disabled: true`.
- Assessment: PASS.

### 3) `/home` shows a prominent mock/fallback non-acceptance warning
- Code review:
  - `atlas-web/src/views/home/HomeView.vue`
  - Non-loading/non-error state now always renders a top warning card before the dashboard cards.
- Browser retest:
  - Seeded a non-pending session and opened `/home`.
  - Warning rendered as:
    - `⚠️ 首页仍是前端 mock / fallback 展示`
    - `这里的指标、快捷入口与待办仅用于演示当前前端壳层，不应作为企业微信真实登录、角色权限或业务接口已联通的验收证据。`
- Assessment: PASS. The wording is prominent and difficult to mistake for acceptance evidence.

## Checks run
- `npm run build` in `atlas-web` ✅
- Targeted browser verification on local Vite dev server ✅

## Residual note
- The callback failure UX is now truthful, but raw transport errors can still surface as browser-native text like `Failed to fetch`. This is not misleading about success, but it is still rough UX and could be normalized later if desired.
