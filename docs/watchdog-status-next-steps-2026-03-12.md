# Atlas Watchdog Status + Next Steps

> 单一事实源（single source of truth）
> 更新时间：2026-03-12 20:25 GMT+8
> 维护角色：Tech Lead / Watchdog
> 当前基线：`02046d0` on `techlead/watchdog-followup-20260312`

## 1. 当前真实状态

### 1.1 已真正完成的部分

#### Sprint 1 mock MVP
**可以按"demo-ready"管理，不应再按"仍待最终收口"管理。**

依据：`docs/qa-final-mock-retest-2026-03-12.md`

当前已被 QA/retest 证明成立：
- 前端 `atlas-web` 可构建；核心页面路由存在。
- 后端 mock 演示链路可启动、健康检查正常。
- 三角色 mock 登录链路可跑通：员工 / 店长 / 运营经理。
- 店长排班批次查看 → 校验 → 提审 → 运营审批 → 发布 → 员工查看已发布班表，这条主链路已跑通。
- RBAC 与状态机关键防线已回归通过：
  - 员工不能创建/发布
  - 店长不能审批
  - 待审批批次不能直接发布
  - 重复提审/重复审批/重复发布都有受控行为

结论：
- **Sprint 1 的 mock MVP 交付目标已达到。**
- 剩余问题已不再是 Sprint 1 P0 blocker，而是 Sprint 2 联调质量问题。

#### Sprint 2 WeCom auth 第一刀（后端合同层）
**后端 auth contract 已从"缺接口/纯占位"推进到"stub/integration pass"，并且已经有可执行 acceptance probe。**

依据：`docs/qa-wecom-auth-watchdog-2026-03-12.md` + 当前代码检查

当前已成立：
- `GET /api/auth/wework/url` 已存在。
- `POST /api/auth/wework/callback` 已不再是纯 placeholder，具备：
  - stub 模式 code -> identity 解析
  - real-mode exchange boundary
  - `pendingAccess` 分支
- `GET /api/auth/me` 已走签名 token 验证链路。
- `POST /api/auth/logout` 已给出明确 stateless contract。
- `atlas-server/.env.example` 的 WeCom 关键配置契约已补齐。
- `npm run test:auth` 已通过。
- `npm run check:wecom-env` / `npm run probe:wecom-acceptance` 已存在，可用于真实环境验收证据收集。

结论：
- **Sprint 2 auth 第一刀后端"合同与烟测"已完成。**
- **现在缺的是"真实环境验收跑通并留证"，不是"后端接口还没定义"。**

---

## 2. 仍然开放的事项

### 2.1 Sprint 2 真正未完成的部分

#### A. 真实 WeCom E2E 仍未验收
当前缺的不是接口，而是环境：
- 真实 `CorpID / AgentID / Secret`
- 可访问的 callback 域名/环境
- 真实测试账号与角色映射
- 至少一组可用于 acceptance probe 的真实 callback code / 证据采集流程

所以当前状态应写成：
- **stub/integration PASS**
- **real WeCom E2E pending environment-backed acceptance**

#### B. 前端仍是 hybrid real-API + fallback/mock
依据：`atlas-web/src/api/atlas.ts`

当前仍存在的混合模式：
- `fetchEmployeeScheduleWithFallback()`
- `fetchApprovalsWithFallback()`
- `fetchApprovalDetailWithFallback()`
- `fetchManagerScheduleWithFallback()`
- 首页摘要仍走 mock 数据

这意味着：
- Sprint 1 demo 没问题；
- 但 Sprint 2 若继续静默 fallback，会掩盖真实联调失败、权限错误、字段漂移、鉴权头问题。

#### C. 本地用户来源仍主要是 mock/in-memory
后端 auth contract 已明显前进，但本地用户查找/权限来源仍基于当前 mock 数据源。

这对当前 smoke/integration 可接受；
但对稳定测试环境/持续联调仍是未关闭项。

#### D. 文档状态已落后于代码/QA 现实
当前 repo 至少有两类过期表述：
1. 把 Sprint 1 写成"仍待最终 retest/仍未关闭"；
2. 把 Sprint 2 auth 写成"callback 还是 placeholder / frontend 还是 mock-first 登录骨架"。

这些说法在 2026-03-12 当前基线下都已经不准确。

---

## 3. Sprint 2 推荐执行顺序（按角色）

### Phase 1 - Tech Lead / PM：冻结验收口径，不再回滚到旧叙事
先统一一句话，不再让团队各自理解：
- Sprint 1 = **done for mock demo**
- Sprint 2 当前入口 = **真实 WeCom 登录验收 + 关闭前端静默 fallback 风险**

Tech Lead 本阶段输出应包括：
- 真实 WeCom E2E 的唯一验收清单
- 前端"哪些页面在真实登录模式下禁止静默 fallback"的边界
- backend / frontend / QA 的联调顺序与 owner

### Phase 2 - Ops / Backend：先拿真实环境，再跑 acceptance probe
先做环境，不要先扩业务页。

顺序：
1. 准备真实 WeCom 测试配置与 callback 环境
2. 准备 3 个真实测试身份：店长 / 员工 / 运营经理
3. 准备 1 个未开通或 inactive 身份用于 `pendingAccess`
4. 校验 `weworkUserId -> Atlas user` 映射
5. 先跑 `npm run check:wecom-env`
6. 再跑 `npm run probe:wecom-acceptance`
7. 回写 success / pendingAccess / `/auth/me` / 401 evidence

原因：
- 当前 backend auth contract 已足够支撑这一步；
- probe 已经存在，下一步应把它用于真实验收，而不是继续停留在"理论上可验收"；
- 如果没有真实环境，继续讨论业务页真假混用价值不高。

### Phase 3 - Frontend：收紧真实登录模式下的 fallback
前端下一步不是扩功能，而是**去掉会遮蔽问题的静默回退**。

优先顺序：
1. 保持 `/login`、`/auth/callback`、`session bootstrap` 继续 real-auth-first
2. 在真实登录模式下，对关键页面至少增加明确提示：当前是 API 成功还是 mock fallback
3. 优先收紧这几个接口调用路径：
   - approvals list
   - approval detail
   - manager schedule
   - employee schedule
4. 首页若暂时仍用 mock，可保留，但要明确标识"不作为真实联调验收依据"

前端此阶段目标：
- **把"接口坏了但页面还能假装可用"的状态尽量消灭。**

### Phase 4 - QA：先测 auth 与角色落页，再测业务深链路
QA 下一轮推荐顺序：
1. 真实 WeCom 登录成功路径
2. 未开通用户 -> `/pending-access`
3. token/session 失效后的恢复与清退
4. 三角色 `/auth/me` 返回与前端落页一致性
5. 再进入业务接口联调：班表、审批、详情、发布

不要一开始就把重点放在更深的排班规则回归上；
先证明"真实身份链路可靠"。

### Phase 5 - Backend：再补持久化最小骨架
真实 auth E2E 稳定后，再推进：
- `users`
- `stores`
- `store_staffs`
- 后续基础读接口从 mock/in-memory 向真实持久化迁移

原因：
- 先做环境验收，可以更快知道当前 auth contract 是否足够；
- 再做持久化切换，返工面更小。

---

## 4. 当前最需要纠正的文档矛盾

### 应视为过期、需要后续改写的文档

#### 1) `docs/sprint1-mock-mvp-watchdog.md`
当前问题：
- 旧版仍写成"需要 final mock E2E retest""Sprint 1 仍未关闭"。

当前状态：
- 本轮已改为 Sprint 1 closure note，不再追踪活跃 P0。

#### 2) `docs/frontend-wecom-sprint2-impact.md`
当前问题：
- 仍描述前端为"demo/mock-first"；
- 仍说 `AuthCallbackView` 只是检查 `?code=` 后伪登录。

为什么不准确：
- 当前代码里 `LoginView.vue` 已是 WeCom 登录优先；
- `AuthCallbackView.vue` 已调用 `exchangeWeComCode()`；
- `session.ts` 已使用 `atlas_session` 且失败时清 session。

建议修正为：
- 前端已进入 real-auth-first 骨架阶段；
- 主要剩余风险转为"业务页 fallback 仍静默存在"。

#### 3) `docs/backend-wecom-auth-gap-sprint2.md`
当前问题：
- 仍写 `POST /api/auth/wework/callback` 是 placeholder。

为什么不准确：
- 当前后端已有 `/wework/url`、签名 token、`pendingAccess`、real-mode exchange boundary；
- 且已新增 `probe:wecom-acceptance`，说明当前缺口已转成"真实环境验收与留证"。

建议修正为：
- backend gap 已从"无合同/纯占位"更新为"真实环境验收待完成 + 用户源仍偏 mock/in-memory"。

#### 4) `docs/tech-lead-plan.md`
当前问题：
- 仍把 Sprint 1 主要工作描述为"把 mock MVP 拉到可演示完成状态"。

为什么不准确：
- 这个目标今天已经完成。

建议修正为：
- Tech Lead 当前工作重心转为 Sprint 2 auth 验收顺序、acceptance probe 证据化、fallback 收紧策略、持久化切换节奏。

---

## 6. 2026-03-12 22:26 Watchdog Tick

### 已完成
- Sprint 1 mock MVP E2E: 5/5 PASS ✅
- Sprint 2 Backend auth contract: stub/integration PASS ✅
- Sprint 2 Frontend WeCom OAuth + Fallback 收紧 ✅

### 进行中
- (none - all Sprint 2 workers completed 22:36)

### 待处理
- Real WeCom environment (pending: CorpID/AgentID/Secret from user)
- QA: acceptance probe (needs real environment)
- Backend: persistence skeleton (after auth stable)

---

## 7. 2026-03-12 22:36 Watchdog Tick (All Sprint 2 Workers Complete)

### 已完成 @ 22:36
- ✅ Sprint 1 mock MVP E2E: 5/5 PASS
- ✅ Sprint 2 Backend auth contract: stub/integration PASS  
- ✅ Sprint 2 Frontend WeCom OAuth + Fallback 收紧
- ✅ Tech Lead: Documentation alignment updated

### 当前状态
- **所有 Sprint 2 第一轮 worker 已完成**
- 当前基线：`02046d0` + recent commits

### 阻塞项 (需要用户介入)
1. **Real WeCom 环境凭证** - 需要 CorpID/AgentID/Secret 才能完成 acceptance probe
2. **QA 真实环境验收** - 依赖上述凭证

### 下一步可选工作 (不依赖 WeCom 凭证)
- Backend: users/stores 持久化最小骨架
- Tech Lead: 准备 Sprint 2 完整验收清单

> 🚨 Watchdog 建议：当前主要瓶颈是"缺少真实 WeCom 环境凭证"，不是代码问题。
