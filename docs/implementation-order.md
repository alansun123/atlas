# Atlas 实施优先级清单

> 基于 `docs/database.md` 与 `docs/api.md` 输出的最小可落地后端实施顺序
> 更新时间：2026-03-11

---

## 1. 目标定义

本清单只关注 **MVP 最小闭环**：

1. 企微登录；
2. 门店 / 员工 / 班次基础数据可查询；
3. 店长创建周排班草稿并校验；
4. 命中例外时可发起特殊审批；
5. 审批通过后可发布；
6. 员工可查看个人班表；
7. 企微请假可同步并参与排班冲突检测。

结论先说：**优先做“读基础数据 + 写排班草稿 + 校验 + 发布/审批”这条主链路，不要先做大量后台管理与 P1 能力。**

---

## 2. 最小数据层落地顺序

### P0：必须先建，缺一条主链路就断

| 顺序 | 表 | 原因 | 依赖接口 |
|---|---|---|---|
| 1 | `users` | 企微身份映射、JWT 登录态、角色权限基础 | `/api/auth/*` |
| 2 | `stores` | 排班与权限的业务归属主体 | `/api/stores` |
| 3 | `store_staffs` | 员工归属门店、可排班员工范围、权限过滤 | `/api/employees` `/api/auth/me` |
| 4 | `store_rules` | 校验规则配置来源，避免人数规则硬编码 | `/api/schedules/*/validate` |
| 5 | `shift_templates` | 创建班表必须依赖班次模板 | `/api/stores/:id/shifts` |
| 6 | `schedule_batches` | 周排班聚合根，承载草稿/审批/发布状态 | `/api/schedules/batches*` |
| 7 | `schedule_entries` | 核心排班事实表 | `/api/schedules/*` `/api/schedules/me` |
| 8 | `approval_requests` | 特殊排班审批主表 | `/api/approvals*` `/api/schedules/*/submit-approval` |
| 9 | `approval_actions` | 审批审计流水，不建后续难补 | `/api/approvals/:id` |
| 10 | `wework_sync_logs` | 企微登录/回调/同步排障生命线 | `/api/auth/wework/callback` `/api/leaves/wework/callback` |

### P0.5：建议与 P0 一起建，开发期实际会马上用到

| 顺序 | 表 | 原因 | 依赖接口 |
|---|---|---|---|
| 11 | `leave_records` | 不做请假冲突校验就无法可信发布排班 | `/api/leaves` `/api/schedules/*/validate` |
| 12 | `wework_approval_sync_cursor` | 手动补偿和定时补偿都需要稳定游标 | `/api/leaves/sync/manual` |

### P1：可以延后

| 表 | 说明 |
|---|---|
| `swap_requests` | 换班是后续功能，不阻塞 MVP 主链路 |

---

## 3. 最小接口落地顺序

### Phase 1：登录与基础只读接口

先让前端能登录并拿到排班依赖数据。

| 优先级 | 接口 | 必要性 | 说明 |
|---|---|---|---|
| 1 | `POST /api/auth/wework/callback` | 阻塞项 | 不通则整个系统不可用 |
| 2 | `GET /api/auth/me` | 阻塞项 | 前端角色路由、权限、默认门店依赖 |
| 3 | `GET /api/stores` | 阻塞项 | 门店选择器、权限内门店列表 |
| 4 | `GET /api/stores/:id/shifts` | 阻塞项 | 排班页渲染班次模板 |
| 5 | `GET /api/employees` | 阻塞项 | 选择可排班员工、识别新员工 |

### Phase 2：排班草稿闭环

先把“创建 - 查看 - 编辑 - 校验”做通。

| 优先级 | 接口 | 必要性 | 说明 |
|---|---|---|---|
| 6 | `POST /api/schedules/batches` | 阻塞项 | 创建周排班草稿 |
| 7 | `GET /api/schedules/batches/:id` | 阻塞项 | 草稿详情回显 |
| 8 | `PATCH /api/schedules/batches/:id` | 高 | 草稿迭代编辑能力 |
| 9 | `POST /api/schedules/batches/:id/validate` | 阻塞项 | 规则校验、审批判断入口 |
| 10 | `GET /api/leaves` | 高 | 前端展示请假与调试校验结果 |

### Phase 3：审批与发布闭环

把“异常 -> 审批 -> 发布”补齐，才算 MVP 可上线。

| 优先级 | 接口 | 必要性 | 说明 |
|---|---|---|---|
| 11 | `POST /api/schedules/batches/:id/submit-approval` | 阻塞项 | 把校验结果转审批 |
| 12 | `POST /api/approvals` | 内部高优先 | 可先作为 service 内部能力，接口保留 |
| 13 | `GET /api/approvals/:id` | 高 | 审批详情页与调试 |
| 14 | `GET /api/approvals/pending` | 高 | 运营经理待审批列表 |
| 15 | `POST /api/approvals/:id/approve` | 阻塞项 | 通过审批 |
| 16 | `POST /api/approvals/:id/reject` | 阻塞项 | 驳回审批 |
| 17 | `POST /api/schedules/batches/:id/publish` | 阻塞项 | 无审批或审批通过后正式发布 |

### Phase 4：员工侧与企微补偿闭环

| 优先级 | 接口 | 必要性 | 说明 |
|---|---|---|---|
| 18 | `GET /api/schedules/calendar` | 高 | 店长/运营查看门店班表 |
| 19 | `GET /api/schedules/me` | 高 | 员工侧个人班表 |
| 20 | `POST /api/leaves/wework/callback` | 阻塞项 | 企微请假主同步入口 |
| 21 | `POST /api/leaves/sync/manual` | 高 | 手动补偿与运维兜底 |
| 22 | `POST /api/auth/logout` | 低 | 可后补，不阻塞主业务 |

---

## 4. 推荐实现分层顺序

按 backend 实际开发，不建议先写 controller 再补数据层；正确顺序如下：

### Step 1：Schema / Migration

1. 建 `users / stores / store_staffs / store_rules / shift_templates`；
2. 建 `schedule_batches / schedule_entries`；
3. 建 `leave_records / wework_approval_sync_cursor`；
4. 建 `approval_requests / approval_actions / wework_sync_logs`。

### Step 2：Repository / DAL

优先完成这些 repository：

- `userRepository`
- `storeRepository`
- `staffRepository`
- `shiftTemplateRepository`
- `scheduleBatchRepository`
- `scheduleEntryRepository`
- `leaveRecordRepository`
- `approvalRequestRepository`
- `approvalActionRepository`
- `syncLogRepository`

### Step 3：Domain Service

优先抽 4 个核心服务：

1. `AuthService`：企微用户换取、本地用户映射、token 签发；
2. `ScheduleValidationService`：人数、重复排班、请假冲突、新员工首周；
3. `ScheduleWorkflowService`：创建草稿、编辑、提交审批、发布；
4. `LeaveSyncService`：企微回调解析、幂等写入、补偿同步。

### Step 4：HTTP Controller

controller 只负责：

- 参数校验；
- 调 service；
- 返回统一响应。

不要把规则判断写进 controller。

---

## 5. 真正阻塞上线的最小闭环

如果资源非常紧，只做下面这一组也能形成可演示可联调 MVP：

### 数据表最小 10+2

- `users`
- `stores`
- `store_staffs`
- `store_rules`
- `shift_templates`
- `schedule_batches`
- `schedule_entries`
- `leave_records`
- `approval_requests`
- `approval_actions`
- `wework_sync_logs`
- `wework_approval_sync_cursor`

### 接口最小 12 个

1. `POST /api/auth/wework/callback`
2. `GET /api/auth/me`
3. `GET /api/stores`
4. `GET /api/stores/:id/shifts`
5. `GET /api/employees`
6. `POST /api/schedules/batches`
7. `GET /api/schedules/batches/:id`
8. `PATCH /api/schedules/batches/:id`
9. `POST /api/schedules/batches/:id/validate`
10. `POST /api/schedules/batches/:id/submit-approval`
11. `POST /api/approvals/:id/approve`
12. `POST /api/schedules/batches/:id/publish`

> 说明：`GET /api/leaves`、`GET /api/approvals/pending`、`GET /api/schedules/me` 虽然重要，但如果做演示版本可稍后补；真实上线前仍建议补齐。

---

## 6. 依赖关系提醒

### 6.1 先后依赖

- 没有 `store_staffs`，`GET /api/employees` 和权限过滤会失真；
- 没有 `store_rules`，`validate` 只能写死规则；
- 没有 `schedule_batches`，审批和发布状态会无处安放；
- 没有 `approval_actions`，审批审计无法补；
- 没有 `wework_sync_logs`，企微联调出了问题基本不可排查。

### 6.2 不要提前做的事

先别把时间花在这些上：

- 换班 `swap_requests`；
- 复杂通知中心；
- 自动排班算法；
- 多级审批流引擎；
- 大而全后台 CRUD。

---

## 7. 最终建议

### 数据层优先级

**基础主数据 → 排班批次/明细 → 请假同步 → 审批流水**

### 接口优先级

**登录鉴权 → 基础查询 → 排班草稿 → 校验 → 审批 → 发布 → 员工查看/同步补偿**

### Tech Lead 结论

如果 Peter 现在开始干后端，最稳的切法是：

1. 先把 schema 和 repository 建完整；
2. 再做 `auth + stores + employees` 只读接口；
3. 然后一次性做透 `schedule_batches` 的创建/编辑/校验/发布状态机；
4. 最后接 `leave sync + approvals`。

这样不会在 controller 层返工，也能最大程度降低 Sprint 2 以后改库的成本。
