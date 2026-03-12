# Atlas Sprint 1 Playbook

> Sprint周期：2026-03-11 ~ 2026-03-17
> 目标：Mock MVP 演示闭环收口（不含真实 WeCom 登录交付）

---

## Sprint 1 目标

1. 前后端 mock MVP 主链路可运行
2. 员工 / 店长 / 运营经理三角色演示链路打通
3. 审批详情、RBAC、批次状态流按当前代码基线收口
4. 以最终 mock E2E retest 作为 Sprint 1 收尾验收

---

## 当前范围说明

- **Sprint 1 验收是 mock MVP demo closure**：mock 登录、排班、审批、发布闭环可演示即可。
- **不再把真实 WeCom OAuth 作为 Sprint 1 阻塞项**。
- 当前代码基线已纳入：
  - 后端 RBAC + 审批流 hardening：`54ec2b8`
  - 前端审批详情 / mock flow hardening：`b577c31`

---

## 本 Sprint 已完成的关键收口

### 1. 前后端基础能力
- [x] 仓库、前端、后端骨架已落地
- [x] mock 登录与 mock API 主链路已具备演示基础
- [x] 审批列表、审批详情、发布链路已有页面/API 承接

### 2. 正确性 hardening
- [x] 后端接口层已补 RBAC 限制，避免仅靠前端隐藏按钮
- [x] 审批 / 发布状态流已按 Sprint 1 mock 口径收紧
- [x] 前端审批详情页与 mock flow 已完成针对性 hardening

---

## Sprint 1 剩余工作

### P0：最终 mock E2E retest（唯一剩余 gate）

QA / 联调需基于当前代码重新跑一轮最小演示链路：

1. 员工：登录 → 首页 → 我的班表
2. 店长：登录 → 排班页 → 生成/查看批次 → 校验 → 提交审批
3. 运营经理：审批列表 → 审批详情 → 通过/驳回
4. 店长：审批通过后发布排班
5. 员工：重新进入我的班表，确认已发布班次可见

### Retest 必记项
- 实际使用的 `batchId / approvalId / userId`
- 审批详情页是否稳定展示并刷新最新状态
- 越权 case 是否返回拒绝（员工创建/发布、店长审批）
- 状态机 case 是否被正确拦截（重复提审、绕过审批直接发布等）

---

## Sprint 1 验收标准

- [x] GitHub 仓库与主文档存在
- [x] 前端与后端基础工程可启动
- [x] mock 登录 / 排班 / 审批 / 发布主链路已实现
- [x] 审批详情链路已完成 hardening，进入最终回归确认
- [x] RBAC 与审批状态流 hardening 已落地，进入最终回归确认
- [x] 完成一轮基于当前代码的 mock E2E retest，并记录结论

### E2E Retest 结果 (2026-03-12)

| 步骤 | 流程 | 状态 |
|------|------|------|
| 1 | 员工：登录 → 查看班表 | ✅ PASS |
| 2 | 店长：生成批次 → 提交审批 | ✅ PASS |
| 3 | 运营经理：审批列表 → 审批详情 → 通过 | ✅ PASS |
| 4 | 店长：发布排班 | ✅ PASS |
| 5 | 员工：查看已发布班次 | ✅ PASS |

**测试记录:**
- Batch/Approval ID: #90002
- 员工: 李四 (员工)
- 店长: 张三 (店长)
- 运营经理: 王经理 (运营经理)

**结论: Sprint 1 MOCK MVP 已完成，可演示发布** ✅

> 只有最后一项 retest 关闭后，Sprint 1 才标记为“mock MVP 可演示完成”。

---

## Sprint 2 预告（不属于本 Sprint 验收）

### WeCom integration 进入 Sprint 2 的前置项
- 企业微信应用信息：`CorpID / AgentID / Secret`
- 前端回调地址与后端回调域名
- `weworkUserId -> Atlas user` 映射与未开通用户策略
- 测试企业环境、测试账号、联调网络可用性

### Sprint 2 首波任务
1. 接入 WeCom OAuth 登录
2. 落本地用户映射 / 登录态 / 权限初始化
3. 明确 pending-access 承接流
4. 接通持久化与必要配置管理

### 暂不纳入 Sprint 2 首波阻塞
- 真实请假同步全量闭环
- 审批回写 WeCom
- 企业微信消息通知完善

---

*Sprint 1 现在不是“做完真实 WeCom 登录”，而是“把 mock MVP 稳定收口并通过最终回归”。*
