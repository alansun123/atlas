# Atlas Sprint 1 Mock MVP Watchdog

> 单一事实源（single source of truth）
> 
> 更新时间：2026-03-12 18:5x GMT+8  
> 维护角色：Tech Lead / Watchdog  
> 基线提交：`19b49cd`（当前 `main`）

## 1. 当前判断

**Sprint 1 现在应按“mock MVP 可演示收口”管理，不应再按“企微登录已纳入本 Sprint 必须完成”管理。**

和早期 `README.md`、`SPRINT1.md` 相比，仓库现实已经变化：

- 前端 `atlas-web/` **已存在且可运行**，不再是“空目录未落地”
- 后端 mock API **已能跑通主链路**
- 当前真正阻塞演示的，不再是脚手架是否存在，而是：
  1. **审批详情页 / 详情链路的小 bug 与不稳定点**
  2. **后端 RBAC 未收口**
  3. **排班批次状态机未完全收紧**
  4. **前后端 mock 端到端回归还没做最终收口**
  5. **企微（WeCom）集成还停留在 Sprint 2 规划层**

## 2. 本轮仓库快照

### 2.1 分支与提交
- 分支：`main`
- 当前头部提交：`19b49cd fix(atlas-server): allow local mock frontend cors`
- 近几次关键提交显示的方向：
  - `4852581` 前端开始接 mock backend API
  - `9a3e5cc` 补了 round 2 smoke 结果
  - `33b6ca1` 前端 MVP demo 脚手架已建
  - `7d6da17` 后端 mock integration API 已建

### 2.2 当前工作区状态
- 未提交变更：`atlas-web/.env`
- 本 watchdog 轮次**不建议改产品代码**，以文档收口为主

## 3. Sprint 1 实际完成度（按 mock MVP 口径）

### 3.1 已完成 / 基本完成
- [x] 前端工程存在，且可运行 / 可 build
- [x] 后端工程存在，且 mock API 可启动
- [x] mock 登录接口存在：`POST /api/auth/mock/login`
- [x] `GET /api/auth/me` 可返回当前用户
- [x] 店长排班批次创建 / 校验 / 提审主链路可跑
- [x] 运营经理待审批列表可查
- [x] 审批通过 / 驳回接口存在
- [x] 发布排班接口存在
- [x] 前端已存在 `/login` `/home` `/employee/schedule` `/manager/schedule` `/approvals` `/approvals/:id` `/pending-access`

### 3.2 未完成 / 未收口
- [ ] 前端不是所有页面都稳定真实联后端，仍保留 fallback / 本地 mock
- [ ] 审批详情链路仍需专项确认（见第 5.1 节）
- [ ] RBAC 未在后端接口层收口（见第 5.2 节）
- [ ] 状态机未完全防穿透（见第 5.3 节）
- [ ] 缺一轮基于真实当前代码的 mock E2E 最终回归（见第 5.4 节）
- [ ] WeCom 集成尚未从规划进入实施（见第 5.5 节）

## 4. 演示门槛（Sprint 1 通过标准）

只有下面 5 条同时成立，Sprint 1 才应被标记为“mock MVP 可演示”：

1. **员工 / 店长 / 运营经理三角色能完成一轮真实 mock 演示**
2. **审批详情页可稳定打开、展示、执行审批动作**
3. **员工不能创建/发布排班，店长不能审批**
4. **已发布批次不能重复提审，需审批批次不能绕过审批直接发布**
5. **文档口径收敛为：Sprint 1 = mock MVP；WeCom 真集成 = Sprint 2**

## 5. 剩余工作清单（明确到四个重点）

### 5.1 Approval detail bug（P0）

**当前判断：这是 Sprint 1 演示链路上的真实风险项，必须单独回归。**

已看到的代码事实：
- 前端已存在 `ApprovalDetailView.vue`
- 前端详情通过 `fetchApprovalDetailWithFallback()` 拉取：
  - `/api/approvals/:id`
  - 如有 `scheduleBatch.id`，继续拉 `/api/schedules/batches/:id`
- 说明：审批详情页现在不是纯静态壳，而是依赖两段真实接口拼装

剩余工作：
- [ ] 用**真实运行态 approvalId** 回归 `/approvals/:id` 页面，而不是手填历史静态 id
- [ ] 验证详情页在以下 4 种状态都能打开：`pending / approved / rejected / 不存在 id`
- [ ] 验证详情页中的“触发规则、班表摘要、审批历史”三块没有空指针/空数组展示问题
- [ ] 验证审批动作完成后 `load()` 重刷能拿到最新状态，而不是停留旧状态或 fallback 到本地 mock
- [ ] 确认审批详情页和列表页使用的是**同一批真实 approvalId**，没有“列表是 API、详情回退到 mock”的数据源漂移

建议验收人：前端 + QA 联合一次过

### 5.2 RBAC fixes（P0）

**当前判断：后端接口层存在越权，属于必须修复项。**

已确认风险：
- 员工可创建排班批次
- 员工可发布排班
- 店长可直接审批
- `GET /api/approvals/pending` / `GET /api/approvals/:id` 是否按角色收口，也应一并确认

剩余工作：
- [ ] 后端为 `POST /api/schedules/batches` 增加角色限制：仅店长（必要时运营经理）可创建
- [ ] 后端为 `POST /api/schedules/batches/:id/publish` 增加角色限制：仅店长可发布本门店批次
- [ ] 后端为 `POST /api/approvals/:id/approve|reject` 增加角色限制：仅运营经理可审批
- [ ] 后端补一轮 403/业务错误回归，确保不是仅靠前端隐藏按钮
- [ ] 文档明确角色矩阵：employee / manager / operation_manager 各自允许动作

建议：RBAC 修完后，把 smoke checklist 里所有“越权应失败”的 case 补进去，不要只留 happy path。

### 5.3 State-machine fixes（P0）

**当前判断：状态机漏洞比 UI bug 更危险，因为它会直接破坏演示口径。**

代码现状显示：
- `submit-approval` 已显式拦截 `published` 批次再次提审
- `publish` 会在 `requiresApproval=true` 且状态不为 `approved/published` 时拦截发布

但 Sprint 1 仍需确认的不是“代码里有判断”，而是“整条状态流不漏口”。

剩余工作：
- [ ] 回归状态流：`draft -> pending_approval -> approved -> published`
- [ ] 回归 reject 分支：`pending_approval -> rejected` 后是否允许店长修订并再次提审；若允许，文档要写清；若不允许，接口要拦清
- [ ] 确认 `requiresApproval=false` 的批次可直接发布，不被误拦
- [ ] 确认 `published` 批次不能再次提审、不能被重复审批、不能被错误回退
- [ ] 确认审批单状态与批次状态始终同步，不出现审批已通过但批次还停留 `pending_approval` 的分叉

建议：把“状态迁移表”补进开发/QA文档，避免大家口头理解不同。

### 5.4 Mock end-to-end retest（P0）

**当前判断：这是 Sprint 1 收口前最后一道门。**

必须重测的最小链路：
- [ ] 员工：登录 -> 首页 -> 我的班表
- [ ] 店长：登录 -> 排班页 -> 生成/查看批次 -> 校验 -> 提交审批
- [ ] 运营经理：登录 -> 审批列表 -> 审批详情 -> 通过/驳回
- [ ] 店长：审批通过后 -> 发布排班
- [ ] 员工：重新进入我的班表 -> 看到已发布班次

回归时必须额外记录：
- [ ] 前端每一步的数据源是 `api` 还是 `mock fallback`
- [ ] 实际使用的 `batchId / approvalId / userId`
- [ ] 失败 case：越权、无 token、错误 id、重复提交、重复审批

交付产物要求：
- [ ] 更新一份最终 smoke 结果文档（建议直接覆盖/续写现有 smoke 文档）
- [ ] 结论必须能回答：**“现在还能不能现场演示？”**

### 5.5 WeCom integration planning（P1 for Sprint 1, P0 for Sprint 2 kickoff）

**当前判断：Sprint 1 不应把 WeCom 真接入当阻塞，但必须把下一步计划写实。**

剩余工作：
- [ ] 在文档里明确：Sprint 1 使用 mock 登录；WeCom OAuth 真接入进入 Sprint 2
- [ ] 列出 WeCom 集成前置项：
  - 企业微信应用信息（CorpID / AgentID / Secret）
  - 回调域名 / 前端回调地址
  - 用户标识映射规则（`weworkUserId` -> Atlas user）
  - 待开通用户承接策略（`pending-access`）
- [ ] 补一页最小集成方案：登录、用户映射、权限初始化、错误回退
- [ ] 标出不在 Sprint 2 首波范围内的项：真实请假同步、审批回写企微、消息通知

## 6. 建议顺序（Tech Lead 推荐）

1. **先修 RBAC**：这是最硬的 correctness 问题
2. **再收状态机**：保证审批/发布不会穿透
3. **然后打 approval detail bug**：确保演示页不翻车
4. **最后做一轮 mock E2E retest**：把结果回写文档
5. **同步补 WeCom Sprint 2 方案页**：让下一棒接得住

## 7. 需要显式标记为“已过期/待改”的文档

以下文档和当前仓库事实已有偏差，后续应以本文件为准：

- `README.md`：仍把 Sprint 1 写成“企微登录”导向
- `SPRINT1.md`：仍按早期初始化目标写，未更新到 mock MVP 收口现实
- `docs/qa-round2.md`：其中“前端仍只有空目录骨架”的结论已过期

## 8. 推荐下一位执行者

**建议下一棒给后端/联调 worker：**
- 先补 RBAC + 状态机回归用例
- 然后交给前端/QA 做 approval detail + 全链路 retest

如果只能派一个 worker，优先级依旧是：
**RBAC / state-machine > approval detail > E2E retest > WeCom plan doc**
