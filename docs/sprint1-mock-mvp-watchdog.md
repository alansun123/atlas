# Atlas Sprint 1 Mock MVP Watchdog

> 单一事实源（historical closure note）
>
> 更新时间：2026-03-12 20:25 GMT+8  
> 维护角色：Tech Lead / Watchdog  
> 当前基线：`02046d0`

## 1. 当前判断

**Sprint 1 mock MVP 已完成，并已被 QA/retest 证实为 demo-ready。这个文件不再用于追踪活跃 P0，只保留为 Sprint 1 关闭说明。**

以当前仓库现实看，下面这些曾经的 Sprint 1 风险都已经关闭，不应继续作为催办事项：

- 前端不存在 / 未进入联调
- 后端 mock 主链路未跑通
- approval detail 仍待补齐
- RBAC 仍只靠前端隐藏按钮
- 审批/发布状态机仍缺防线
- Sprint 1 还需要 final mock retest 才能判断是否可演示

当前正确口径应统一为：

- **Sprint 1 = mock MVP completed / demo-ready**
- **approval-detail / RBAC / state-machine hardening = closed**
- **当前活跃 P0 已切换到 Sprint 2 real WeCom acceptance**

参考依据：
- `docs/qa-final-mock-retest-2026-03-12.md`
- `docs/qa-approval-hardening-retest-2026-03-12.md`
- `docs/tech-lead-sprint2-source-of-truth-2026-03-12.md`

## 2. Sprint 1 已关闭的交付结论

### 2.1 已成立
- [x] 员工 / 店长 / 运营经理三角色 mock 演示链路可跑通
- [x] 店长排班批次创建 / 校验 / 提审主链路可跑
- [x] 运营经理待审批列表、审批详情、通过 / 驳回链路可跑
- [x] 店长可在审批通过后发布排班
- [x] 员工可查看已发布班表
- [x] approval detail hardening 已落地并完成回归
- [x] 后端 RBAC / 状态机 hardening 已落地并完成回归
- [x] Sprint 1 mock MVP 已具备现场演示条件

### 2.2 不再属于 Sprint 1 blocker
- [x] WeCom 集成不属于 Sprint 1 gate
- [x] approval-detail / RBAC / state-machine 不再属于活跃 P0
- [x] final mock E2E retest 不再是待办项；其结论已经体现在 QA 文档中

## 3. 现在不该再怎么描述 Sprint 1

以下表述在 `02046d0` 基线下都应视为过期：

- “Sprint 1 仍待最终 mock retest。”
- “Sprint 1 仍未关闭。”
- “approval detail 还是未完成项。”
- “RBAC / 状态机 hardening 仍需作为当前 P0 追踪。”
- “下一步应该继续冲 Sprint 1 mock 收口。”

## 4. 正确的衔接关系

Sprint 1 关闭后，唯一合理的规划衔接是：

1. **Ops + Backend**：准备真实 WeCom 环境并运行 acceptance probe
2. **Backend**：记录真实 success / pendingAccess / `/api/auth/me` 连续性证据
3. **Frontend**：收紧或显式暴露关键页面 fallback，避免掩盖真实 auth/API 失败
4. **QA**：按 auth-first 顺序复验真实登录链路，再看业务链路

## 5. 结论

本文件之后，Sprint 1 的 Watchdog 结论应固定为：

> **Sprint 1 mock MVP 已完成；当前不应再把 Sprint 1 收口或 approval hardening 伪装成活跃 P0。团队下一步应直接进入 Sprint 2 real WeCom acceptance。**
