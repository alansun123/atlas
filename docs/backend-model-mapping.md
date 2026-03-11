# Atlas 后端模型落地映射

> 输出目标：把 `docs/database.md` 的表结构映射成后端模块、核心职责与接口入口
> 形式：表 -> 模块 -> 服务/仓储 -> 接口
> 更新时间：2026-03-11

---

## 1. 建议的后端模块边界

建议以业务聚合划分，而不是一张表一个模块：

- `auth`：登录、当前用户、token
- `user`：用户主数据
- `store`：门店、门店规则、门店员工关系、班次模板
- `schedule`：排班批次、排班明细、校验、发布
- `leave`：请假记录、企微同步游标
- `approval`：特殊排班审批主表、动作流水
- `wework`：企微 OAuth、审批回调、同步日志

> 重点：`store_staffs` 不应单独漂成“employee 模块数据库”；它更像 `store` 与 `user` 之间的关系实体，但读接口仍然可以暴露为 `/api/employees`。

---

## 2. 表 -> 模块 -> 接口总表

| 表 | 归属模块 | 核心服务 | 主要接口 |
|---|---|---|---|
| `users` | `auth` / `user` | `AuthService`, `UserService` | `/api/auth/wework/callback`, `/api/auth/me` |
| `stores` | `store` | `StoreService` | `/api/stores`, `/api/stores/:id` |
| `store_staffs` | `store` | `StoreStaffService` | `/api/employees`, `/api/auth/me` |
| `store_rules` | `store` | `StoreRuleService` | 间接被 `/api/schedules/batches/:id/validate` 使用 |
| `shift_templates` | `store` / `schedule` | `ShiftTemplateService` | `/api/stores/:id/shifts` |
| `schedule_batches` | `schedule` | `ScheduleWorkflowService` | `/api/schedules/batches*` |
| `schedule_entries` | `schedule` | `ScheduleEntryService`, `ScheduleValidationService` | `/api/schedules/batches/:id`, `/api/schedules/calendar`, `/api/schedules/me` |
| `leave_records` | `leave` | `LeaveService`, `LeaveSyncService` | `/api/leaves`, `/api/leaves/wework/callback`, `/api/leaves/sync/manual` |
| `approval_requests` | `approval` | `ApprovalService` | `/api/approvals*`, `/api/schedules/batches/:id/submit-approval` |
| `approval_actions` | `approval` | `ApprovalActionService` | `/api/approvals/:id`, `/api/approvals/:id/approve`, `/api/approvals/:id/reject` |
| `wework_sync_logs` | `wework` | `WeworkSyncLogService` | 企微登录/回调内部写入，无需直接暴露业务接口 |
| `wework_approval_sync_cursor` | `leave` / `wework` | `LeaveSyncService` | `/api/leaves/sync/manual` |
| `swap_requests` | `swap`（P1） | `SwapService` | P1 接口 |

---

## 3. 逐表落地建议

### 3.1 `users`

**表职责**

- Atlas 本地用户主表；
- 承接企微身份 `wework_user_id`；
- 记录系统角色与状态。

**建议模块**

- 写入口归 `auth`；
- 通用读能力归 `user`；
- 避免 controller 直接查库，统一经 `UserRepository`。

**建议代码落点**

- `modules/auth/auth.service.ts`
- `modules/user/user.repository.ts`
- `modules/user/user.service.ts`

**关联接口**

- `POST /api/auth/wework/callback`
- `GET /api/auth/me`
- `POST /api/auth/logout`

**实现要点**

- `wework_user_id` 做唯一约束；
- `role/status/joined_at` 为核心字段，不要在 MVP 里做成可空；
- 不要再加 `users.store_id` 作为主归属字段，主归属由 `store_staffs` 承担。

---

### 3.2 `stores`

**表职责**

- 门店主数据；
- 保存店长/运营经理负责人；
- 品牌类型影响默认规则。

**建议模块**

- `store`

**建议代码落点**

- `modules/store/store.repository.ts`
- `modules/store/store.service.ts`
- `modules/store/store.controller.ts`

**关联接口**

- `GET /api/stores`
- `GET /api/stores/:id`

**实现要点**

- `code` 唯一；
- 负责人与数据权限判断可先直接基于 `manager_user_id / operation_manager_user_id`；
- 后续如多负责人再扩展关系表，不影响 MVP。

---

### 3.3 `store_staffs`

**表职责**

- 用户在门店的任职关系；
- 支撑多店、调店、主门店判定；
- 决定哪些员工可被加入某店排班。

**建议模块**

- 归 `store` 模块；
- 对外读接口仍可命名为 `employees`。

**建议代码落点**

- `modules/store/store-staff.repository.ts`
- `modules/store/store-staff.service.ts`
- `modules/employee/employee.controller.ts`（可选，仅接口层）

**关联接口**

- `GET /api/employees`
- `GET /api/auth/me`

**实现要点**

- `UNIQUE (store_id, user_id)`；
- 用 `is_primary + status=active` 算当前主门店；
- `GET /api/employees` 应 join `users + store_staffs + stores` 返回业务视图。

---

### 3.4 `store_rules`

**表职责**

- 门店默认规则配置；
- 校验服务的输入来源之一。

**建议模块**

- `store`

**建议代码落点**

- `modules/store/store-rule.repository.ts`
- `modules/store/store-rule.service.ts`

**关联接口**

- 无独立 MVP 接口；
- 由 `POST /api/schedules/batches/:id/validate` 间接读取。

**实现要点**

- 一个门店一条规则；
- 班次未配置上下限时，可退回使用 `store_rules` 默认值；
- 新员工保护天数建议从这里读，不要写死 7 天。

---

### 3.5 `shift_templates`

**表职责**

- 门店班次模板；
- 班次时段与人数上下限配置。

**建议模块**

- 归 `store` 管理，供 `schedule` 使用。

**建议代码落点**

- `modules/store/shift-template.repository.ts`
- `modules/store/shift-template.service.ts`

**关联接口**

- `GET /api/stores/:id/shifts`

**实现要点**

- `UNIQUE (store_id, code)`；
- `min_staff/max_staff` 是校验主输入，不建议懒加载成前端常量；
- 创建排班时把模板时间展开写进 `schedule_entries.start_at/end_at`。

---

### 3.6 `schedule_batches`

**表职责**

- 一周排班的聚合根；
- 承载草稿、待审批、已审批、已发布状态。

**建议模块**

- `schedule`

**建议代码落点**

- `modules/schedule/schedule-batch.repository.ts`
- `modules/schedule/schedule-workflow.service.ts`
- `modules/schedule/schedule.controller.ts`

**关联接口**

- `POST /api/schedules/batches`
- `PATCH /api/schedules/batches/:id`
- `GET /api/schedules/batches/:id`
- `POST /api/schedules/batches/:id/validate`
- `POST /api/schedules/batches/:id/submit-approval`
- `POST /api/schedules/batches/:id/publish`

**实现要点**

- `version` 必须尽早落地，避免覆盖历史；
- `validation_status` 与 `requires_approval` 是前端列表页快速展示字段；
- 提交审批、审批通过、发布都应该以 batch 为状态机核心，不要散落到 entry 层单独控制。

---

### 3.7 `schedule_entries`

**表职责**

- 排班事实明细；
- 支撑门店日历视图、员工个人班表、请假冲突校验。

**建议模块**

- `schedule`

**建议代码落点**

- `modules/schedule/schedule-entry.repository.ts`
- `modules/schedule/schedule-validation.service.ts`
- `modules/schedule/schedule-query.service.ts`

**关联接口**

- `GET /api/schedules/batches/:id`
- `GET /api/schedules/calendar`
- `GET /api/schedules/me`

**实现要点**

- 请求入参是“某天某班次下有 employeeIds[]”，落库时应展开为多条 `schedule_entries`；
- 冲突校验依赖 `user_id + schedule_date/start_at/end_at`；
- 发布时批量把 batch 下 entry 状态推进到 `published`。

---

### 3.8 `leave_records`

**表职责**

- 企微请假审批的本地事实快照；
- 给排班校验提供冲突判断依据。

**建议模块**

- `leave`

**建议代码落点**

- `modules/leave/leave-record.repository.ts`
- `modules/leave/leave.service.ts`
- `modules/leave/leave-sync.service.ts`

**关联接口**

- `GET /api/leaves`
- `POST /api/leaves/wework/callback`
- `POST /api/leaves/sync/manual`

**实现要点**

- `wework_approval_instance_id` 唯一，所有回调和补偿都走 upsert；
- `approval_status` 使用 `approved / revoked / partially_revoked`；
- 不要把 `leave_records` 简化成只存 approved，否则后续撤销会把事实打坏。

---

### 3.9 `approval_requests`

**表职责**

- 特殊排班审批主表；
- 保存当前审批状态与当前审批人。

**建议模块**

- `approval`

**建议代码落点**

- `modules/approval/approval-request.repository.ts`
- `modules/approval/approval.service.ts`
- `modules/approval/approval.controller.ts`

**关联接口**

- `POST /api/approvals`
- `GET /api/approvals/pending`
- `GET /api/approvals/:id`
- `POST /api/approvals/:id/approve`
- `POST /api/approvals/:id/reject`
- `POST /api/schedules/batches/:id/submit-approval`

**实现要点**

- `request_no` 建议 service 层生成；
- `trigger_reasons_json` 直接保存规则 code 数组或对象数组；
- `current_approver_id` 在 MVP 里固定指向门店运营经理即可。

---

### 3.10 `approval_actions`

**表职责**

- 审批动作流水；
- 审计和详情页时间线来源。

**建议模块**

- `approval`

**建议代码落点**

- `modules/approval/approval-action.repository.ts`
- `modules/approval/approval-action.service.ts`

**关联接口**

- `GET /api/approvals/:id`
- `POST /api/approvals/:id/approve`
- `POST /api/approvals/:id/reject`

**实现要点**

- 创建审批单时就写一条 `submit`；
- 审批通过/驳回分别再写 `approve/reject`；
- 详情页建议返回 `request + actions[]` 聚合结构。

---

### 3.11 `wework_sync_logs`

**表职责**

- 企微登录、审批回调、补偿同步日志；
- 排障与人工重试依据。

**建议模块**

- `wework`

**建议代码落点**

- `modules/wework/wework-sync-log.repository.ts`
- `modules/wework/wework-sync-log.service.ts`

**关联接口**

- 无直接业务接口；
- 由以下流程内部写入：
  - `POST /api/auth/wework/callback`
  - `POST /api/leaves/wework/callback`
  - `POST /api/leaves/sync/manual`

**实现要点**

- 这是 cross-cutting 基础设施，不属于某个 controller 的临时日志；
- 建议所有企微交互统一封装写日志，避免各模块自己拼。

---

### 3.12 `wework_approval_sync_cursor`

**表职责**

- 记录请假补偿同步窗口；
- 保证补偿任务可恢复、可追踪。

**建议模块**

- `leave` 或 `wework`，二选一即可；
- 更建议放 `leave`，因为它直接服务请假同步业务。

**建议代码落点**

- `modules/leave/leave-sync-cursor.repository.ts`
- `modules/leave/leave-sync.service.ts`

**关联接口**

- `POST /api/leaves/sync/manual`

**实现要点**

- 游标更新必须与同步成功结果强绑定；
- 失败时不要推进 cursor；
- 建议记录最近错误，方便运维查看。

---

### 3.13 `swap_requests`（P1）

**表职责**

- 员工换班申请；
- 当前不进入 MVP 主链路。

**建议模块**

- `swap`

**当前建议**

- 可预建表；
- 不要进入 Sprint 1 / MVP 主开发。

---

## 4. 推荐的后端目录映射

```text
atlas-server/src/modules/
├── auth/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.routes.ts
├── user/
│   ├── user.repository.ts
│   └── user.service.ts
├── store/
│   ├── store.controller.ts
│   ├── store.service.ts
│   ├── store.repository.ts
│   ├── store-staff.repository.ts
│   ├── store-rule.repository.ts
│   └── shift-template.repository.ts
├── employee/
│   └── employee.controller.ts
├── schedule/
│   ├── schedule.controller.ts
│   ├── schedule-workflow.service.ts
│   ├── schedule-validation.service.ts
│   ├── schedule-query.service.ts
│   ├── schedule-batch.repository.ts
│   └── schedule-entry.repository.ts
├── leave/
│   ├── leave.controller.ts
│   ├── leave.service.ts
│   ├── leave-sync.service.ts
│   ├── leave-record.repository.ts
│   └── leave-sync-cursor.repository.ts
├── approval/
│   ├── approval.controller.ts
│   ├── approval.service.ts
│   ├── approval-request.repository.ts
│   └── approval-action.repository.ts
└── wework/
    ├── wework.client.ts
    ├── wework-callback.controller.ts
    ├── wework-sync-log.repository.ts
    └── wework-sync-log.service.ts
```

> 如果当前脚手架还是 JS/Express，也可以先按这个边界落 JS 文件，不必等 TS 全部迁移完再开始。

---

## 5. 最小联调对象建议

为降低前后端联调成本，建议先稳定以下 DTO：

- `AuthMeDTO`
- `StoreListItemDTO`
- `EmployeeListItemDTO`
- `ScheduleBatchDetailDTO`
- `ScheduleValidationResultDTO`
- `ApprovalDetailDTO`
- `LeaveRecordDTO`

这些 DTO 基本就覆盖了 MVP 90% 的页面读取需求。

---

## 6. 结论

### 最重要的模型划分

- **身份事实**：`users`
- **门店归属事实**：`store_staffs`
- **排班聚合根**：`schedule_batches`
- **排班事实明细**：`schedule_entries`
- **请假事实**：`leave_records`
- **审批当前态 + 审计流水**：`approval_requests` + `approval_actions`
- **外部集成可观测性**：`wework_sync_logs`

### 最容易踩坑的地方

1. 把门店归属塞回 `users.store_id`；
2. 没有 `schedule_batches` 就直接做排班明细；
3. 请假同步只存通过态，不处理撤销；
4. 审批没有动作流水；
5. 企微回调没有独立 sync log。

这几个点我已经在文档口径里统一好了，后端按这个映射开工，基本不会在 Sprint 2 被迫大改模型。
