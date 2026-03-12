# Atlas Tech Lead Plan

> 目标：在 Sprint 1 内把 Atlas 拉到“mock MVP 可演示完成”状态，并优先减少文档与代码漂移。
> 更新时间：2026-03-12

## 执行计划

1. **冻结 Sprint 1 演示边界为 mock MVP**
   - 以“mock 登录 + mock 排班/审批/发布闭环”为 Sprint 1 演示口径。
   - 真实 WeCom OAuth、持久化、请假回调保留接口与文档，但不作为本 Sprint 演示阻塞项。

2. **把 README / Sprint / Watchdog 文档统一到当前仓库事实**
   - 统一仓库地址为 `github.com/alansun123/atlas`。
   - 明确 Sprint 1 验收是 mock MVP demo closure，而不是 WeCom 登录交付。
   - 避免再出现“RBAC 未收口 / 审批详情未完成 / Sprint 1 必须上 WeCom”三类过期表述。

3. **确认已落地 hardening 已从“待做”切为“待最终回归”**
   - 后端 RBAC + approval flow hardening 已落地：`54ec2b8`。
   - 前端 approval detail / mock flow hardening 已落地：`b577c31`。
   - 这些项现在是 QA retest 关注点，不再是 Tech Lead 待分派开发项。

4. **锁定前后端联调合同为现有 mock API**
   - 前端第一轮只对接已存在的后端 mock 路由：`/api/auth`、`/api/stores`、`/api/employees`、`/api/schedules`、`/api/leaves`、`/api/approvals`。
   - 不新增第二套命名，缺口通过补文档或补最小兼容接口解决。

5. **Sprint 1 仅保留最终 mock E2E retest 作为收口 gate**
   - 员工：mock 登录 → `/home` → `/employee/schedule`。
   - 店长：mock 登录 → `/manager/schedule` → 生成/查看批次 → 校验 → 提交审批。
   - 运营经理：`/approvals` → `/approvals/:id` → 通过/驳回。
   - 店长/员工：审批通过后发布排班，员工侧能看到已发布班表。
   - Retest 同时确认 approval detail 刷新、RBAC 拒绝、状态机拦截都符合当前 hardening 基线。

6. **建立一份单一事实源的验收清单**
   - 以 `docs/mvp-delivery-checklist.md` 作为演示验收主表。
   - 每补齐一个页面、接口或脚手架，就同步更新清单，避免 README、QA、Sprint 各写各的。

7. **Sprint 2 以 WeCom 集成为明确 kickoff 主题**
   - 前置项：CorpID / AgentID / Secret、回调域名、用户映射规则、pending-access 承接。
   - 首波范围：WeCom OAuth、本地用户映射/登录态、权限初始化、基础持久化。
   - 暂不把请假同步全量闭环、审批回写 WeCom、消息通知作为 Sprint 2 首波阻塞。
