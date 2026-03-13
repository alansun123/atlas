# Atlas Watchdog Status + Next Steps

> 状态镜像（status mirror）  
> 更新时间：2026-03-13 20:13 GMT+8  
> 维护角色：Tech Lead / Watchdog  
> 权威 planning 文档：`docs/tech-lead-sprint2-source-of-truth-2026-03-12.md`  
> 最新 backend/env 执行清单：`docs/backend-wecom-env-owner-preflight-checklist-2026-03-13.md`

## 1. Current repo truth

### Closed / no longer active P0
- Sprint 1 mock MVP retest: PASS / demo-ready
- approval-detail hardening + RBAC/state-machine hardening: PASS for intended Sprint 1 scope
- Sprint 2 backend auth contract + probe support: landed on current baseline
- frontend real-auth-first skeleton + auth-truthfulness retest: PASS
- latest relevant implementation commits:
  - `61b0315 fix(web): make auth fallback states truthful`
  - `382d4a8 feat(atlas-server): add auth request tracing logs`

### Still open
#### Blocked by user/env
- real WeCom credentials (`CorpID / AgentID / Secret`)
- confirmed callback/redirect environment
- real mapped identities + one pending-access identity
- real-env `probe:wecom-acceptance` evidence run
- redirect override is no longer assumed available by default; shared-env acceptance must use the configured callback path, with override enabled only for explicit local smoke tests

#### Executable now without credentials
- Tech Lead: keep source-of-truth / watchdog wording aligned to current repo truth
- Backend/env owner: use `docs/backend-wecom-env-owner-preflight-checklist-2026-03-13.md` as the frozen preflight packet, but do not start the real acceptance run until credentials + callback environment + mapped identities are actually ready
- Frontend/QA: treat current remaining work as regression-only follow-up, not a default respawn trigger
- No additional Frontend, Backend, or QA worker should be spawned from this status alone unless a new failing retest appears or the env blocker is removed
- 19:33 watchdog tick revalidated that the latest worker completion was Tech Lead doc-only alignment (`58cb097`), with no subsequent implementation commit, no active Atlas role worker, and no newly-available env prerequisite that would change the execution order
- 19:43 watchdog tick rechecked active workers and branch head: no Atlas role worker is active, the working tree is still clean, branch-head movement remains doc/watchdog-only (`0f59558`, `d0e8df4`, `58cb097`, `6a9f580`), and no fresh regression or env-unblock signal was found that would change the next-step order
- 19:53 watchdog tick reconfirmed the same posture after re-reading the current source-of-truth packet: no active Atlas role worker, working tree still clean, latest branch-head movement is still watchdog/doc-only (`4b079fa`, `0f59558`, `d0e8df4`, `58cb097`, `6a9f580`), and the next role-appropriate step remains Tech Lead status maintenance until real WeCom env handoff or a fresh failing regression appears
- 20:08 watchdog tick rechecked active Atlas sessions and branch head: no Atlas role worker is active, working tree remains clean, the latest branch-head movement is still watchdog/doc maintenance only (`8683e2b`, `f0fcd10`, `4b079fa`, `0f59558`, `d0e8df4`), and there is still no fresh regression or env-unblock signal that changes the next-step order
- 20:13 watchdog tick rechecked active Atlas sessions and repo head: no Atlas role worker is active, working tree remains clean, branch-head movement is still watchdog/doc maintenance only (`6e6fef2`, `8683e2b`, `f0fcd10`, `4b079fa`, `0f59558`), and there is still no new implementation delta, failing regression, or env-unblock signal that changes the next-step order

## 2. Correct wording for the remaining gap
The remaining gap is:
- **real WeCom environment-backed acceptance**
- plus **targeted regression verification after auth identity source changes**

The remaining gap is **not**:
- Sprint 1 still unclosed
- approval-detail fix still unimplemented
- backend WeCom callback still placeholder-only

## 3. Role owners
- **Tech Lead:** source-of-truth planning, sequencing, owner handoff, and watchdog suppression until a real trigger appears
- **Frontend:** no new execution owner right now unless a fresh regression is found
- **Backend:** real auth evidence once env exists; keep `req.user` contract stable
- **QA:** execute the already-prepared auth-first verification order once env exists, or if a fresh regression appears

## 4. Next-step order
### Before credentials arrive
1. Tech Lead keeps planning/status wording aligned and prevents closed Sprint 1 work from being reopened as pseudo-P0.
2. Do not spawn additional Frontend or QA workers solely for fallback/auth-checklist work; those artifacts have already landed on the current branch.
3. Backend continues only truly independent work that does not redefine auth acceptance; otherwise wait for the real env blocker to clear.

### Once credentials/env arrive
1. Backend/env owner confirms real secrets + redirect/callback alignment.
2. Backend runs `npm run check:wecom-env`.
3. Backend runs `npm run probe:wecom-acceptance` with real callback codes.
4. QA verifies success path, `pendingAccess`, `/auth/me`, invalid-session handling.
5. QA runs focused approval-detail / RBAC / state-machine regression verification under real-auth identities.
6. Tech Lead issues one final acceptance verdict with evidence.

## 5. Most important unblocker
> 当前首要阻塞是：**缺真实 WeCom 环境凭证与 callback 条件**。  
> 当前首要非阻塞执行项是：**仅保持 source-of-truth / handoff 文档与当前分支一致；不要因状态文案而默认重开 Frontend / QA / Backend 执行。**
