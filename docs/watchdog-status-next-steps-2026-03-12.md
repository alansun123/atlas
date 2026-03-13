# Atlas Watchdog Status + Next Steps

> 状态镜像（status mirror）  
> 更新时间：2026-03-12 23:12 GMT+8  
> 维护角色：Tech Lead / Watchdog  
> 权威 planning 文档：`docs/tech-lead-sprint2-source-of-truth-2026-03-12.md`

## 1. Current repo truth

### Closed / no longer active P0
- Sprint 1 mock MVP retest: PASS / demo-ready
- approval-detail hardening + RBAC/state-machine hardening: PASS for intended Sprint 1 scope
- Sprint 2 backend auth contract: stub/integration PASS
- frontend real-auth-first skeleton: landed

### Still open
#### Blocked by user/env
- real WeCom credentials (`CorpID / AgentID / Secret`)
- confirmed callback/redirect environment
- real mapped identities + one pending-access identity
- real-env `probe:wecom-acceptance` evidence run

#### Executable now without credentials
- Tech Lead: keep source-of-truth / watchdog wording aligned to current repo truth
- Backend/env owner: wait for real WeCom credentials + callback environment, then execute the acceptance sequence without reopening closed Sprint 1 work
- No additional Frontend or QA worker should be spawned from this status alone unless a new failing retest appears or the env blocker is removed

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
> 当前首要非阻塞执行项是：**把 fallback/masking 风险和 QA 验证顺序彻底讲清并收紧。**
