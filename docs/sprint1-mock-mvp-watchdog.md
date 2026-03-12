# Atlas Sprint 1 Mock MVP Watchdog

> 单一事实源（single source of truth）
>
> 更新时间：2026-03-12 18:52 GMT+8  
> 维护角色：Tech Lead / Watchdog  
> 基线提交：`54ec2b8`（后端 hardening 已落地；前端 approval-detail hardening 参考 `b577c31`）

## 1. 当前判断

**Sprint 1 现在应按“mock MVP 可演示收口”管理，最终 gate 是 mock E2E retest，而不是真实 WeCom 登录交付。**

和早期 `README.md`、`SPRINT1.md` 相比，仓库现实已经进一步收敛：

- 前端 `atlas-web/` 已存在且已进入 mock backend 联调阶段
- 后端 mock API 主链路可跑通
- 后端 RBAC / approval flow hardening 已落地（`54ec2b8`）
- 前端 approval detail / mock flow hardening 已落地（`b577c31`）
- **当前剩余 Sprint 1 gate：一轮基于当前代码的最终 mock E2E / QA retest**
- WeCom 集成仍应明确放入 Sprint 2 kickoff

## 2. Sprint 1 实际完成度（按当前基线）

### 2.1 已完成 / 已进入“待最终回归确认”
- [x] 前端工程存在，且已进入联调
- [x] 后端 mock API 可启动并承接主链路
- [x] mock 登录 / `GET /api/auth/me` 可支撑演示
- [x] 店长排班批次创建 / 校验 / 提审主链路可跑
- [x] 运营经理待审批列表、审批通过 / 驳回接口存在
- [x] 发布排班接口存在
- [x] 前端已存在 `/login` `/home` `/employee/schedule` `/manager/schedule` `/approvals` `/approvals/:id` `/pending-access`
- [x] 后端 RBAC 已收口到接口层，不再仅依赖前端隐藏按钮
- [x] 审批 / 发布状态流已按 Sprint 1 mock 口径收紧
- [x] 审批详情页与 mock flow hardening 已完成开发侧修补

### 2.2 Sprint 1 仍未关闭
- [ ] 需要一轮最终 mock E2E retest，把上述 hardening 在真实联调路径上再确认一次
- [ ] 需要把 retest 结果写回 smoke / QA 文档，形成“现在是否可演示”的结论
- [ ] WeCom 集成仍停留在 Sprint 2 计划层，不属于本 Sprint 阻塞项

## 3. Sprint 1 验收口径

只有下面 4 条同时成立，Sprint 1 才应被标记为“mock MVP 可演示完成”：

1. **员工 / 店长 / 运营经理三角色能跑通一轮真实 mock 演示**
2. **审批详情页能稳定打开、展示、执行审批并刷新最新状态**
3. **RBAC / 状态机回归通过：越权与错误状态迁移都会被拦截**
4. **文档口径已统一为：Sprint 1 = mock MVP；WeCom 真集成 = Sprint 2**

## 4. 唯一剩余 P0：Final mock E2E retest

必须重测的最小链路：

- [ ] 员工：登录 -> 首页 -> 我的班表
- [ ] 店长：登录 -> 排班页 -> 生成/查看批次 -> 校验 -> 提交审批
- [ ] 运营经理：登录 -> 审批列表 -> 审批详情 -> 通过/驳回
- [ ] 店长：审批通过后 -> 发布排班
- [ ] 员工：重新进入我的班表 -> 看到已发布班次

回归时必须额外记录：

- [ ] 实际使用的 `batchId / approvalId / userId`
- [ ] 审批详情页在 `pending / approved / rejected / 不存在 id` 下的表现
- [ ] 越权 case：员工创建/发布、店长审批、无 token、错误 id
- [ ] 状态机 case：重复提审、绕过审批直接发布、重复审批/重复发布
- [ ] 每一步是否命中真实 API 还是 fallback

交付产物要求：

- [ ] 更新最终 smoke / QA 结果文档
- [ ] 结论必须明确回答：**“现在还能不能现场演示？”**

## 5. Sprint 2：WeCom integration planning

Sprint 2 应明确以 WeCom 真集成为 kickoff，而不是继续把它写成模糊远期项。

### 5.1 前置项
- 企业微信应用信息：`CorpID / AgentID / Secret`
- 前端回调地址、后端回调域名与环境配置
- `weworkUserId -> Atlas user` 映射规则
- 未开通用户进入 `/pending-access` 的承接策略
- 测试企业环境、测试账号、联调网络可用性

### 5.2 Sprint 2 首波任务
1. 接入 WeCom OAuth 登录
2. 完成本地用户映射 / 登录态 / 权限初始化
3. 接入基础持久化与必要配置管理
4. 补最小联调验证：登录、回调、用户识别、待开通兜底

### 5.3 暂不作为 Sprint 2 首波阻塞
- 真实请假同步全量闭环
- 审批回写 WeCom
- 企业微信消息通知完善

## 6. 本轮文档收口结论

本文件之后，Sprint 1 的 Tech Lead 判断应统一为：

- **不是继续派开发做“真实 WeCom 登录冲刺”**
- **也不是继续把 RBAC / approval detail 当未开发事项追人**
- **而是把 QA retest 跑完，并用结果决定 Sprint 1 是否正式关门**
