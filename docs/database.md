# Atlas 数据库设计文档

> 项目：Atlas 企微门店智能排班系统  
> 文档版本：v1.0  
> 更新时间：2026-03-11  
> 适用范围：MVP / Sprint 1~4

---

## 1. 文档目标

本文档基于以下输入整理：

- `docs/智能排班系统PRD.md`
- `projects/atlas/docs/architecture.md`
- `projects/atlas/atlas-server` 当前后端脚手架

目标是直接给开发使用，明确：

1. MVP 必需表；
2. 字段级说明；
3. 主外键关系；
4. 索引建议；
5. 企微用户 / 门店 / 员工 / 排班 / 请假同步 / 审批相关表；
6. 哪些字段是 **MVP 必选**，哪些字段是 **预留**。

---

## 2. 设计原则

### 2.1 业务事实源原则

- **企微是身份源与请假审批事实源**：
  - 用户身份以企业微信 `wework_user_id` 为外部唯一标识；
  - 请假审批结果以企微审批实例为准。
- **Atlas 是排班事实源**：
  - 班表、特殊排班审批、排班批次状态以 Atlas 本地库为准。

### 2.2 MVP 建模原则

MVP 先保证主链路闭环：

- 企微登录
- 门店与员工主数据
- 班次模板
- 周排班草稿 / 发布
- 请假同步
- 特殊排班审批
- 员工查看个人班表

不在首期过度设计：

- 不做复杂排班算法表
- 不做通用工作流引擎表
- 不做薪资 / 考勤 / BI 大表

### 2.3 建议技术口径

- 数据库：**MySQL 8**
- 字符集：`utf8mb4`
- 主键：统一使用 `BIGINT UNSIGNED` 自增（MVP 简单稳定）
- 时间：统一使用 `DATETIME`，服务端按 Asia/Shanghai 管理
- JSON 字段：用于保存规则命中详情、企微原始 payload、扩展属性
- 软删除：MVP 暂不强制全表软删除；核心事实表以 `status` 控制即可

---

## 3. MVP 必需表总览

以下为 MVP 必需表：

| 表名 | 用途 | MVP 是否必需 |
|---|---|---|
| `users` | 本地用户主表，承接企微身份映射、角色、状态 | 必需 |
| `stores` | 门店主数据 | 必需 |
| `store_staffs` | 用户与门店任职关系，支持多店/历史归属 | 必需 |
| `shift_templates` | 门店班次模板 | 必需 |
| `schedule_batches` | 周排班批次（草稿/待审批/已发布） | 必需 |
| `schedule_entries` | 具体排班记录（员工-日期-班次） | 必需 |
| `leave_records` | 企微请假同步后的本地事实表 | 必需 |
| `approval_requests` | 特殊排班审批主表 | 必需 |
| `approval_actions` | 审批动作流水 | 必需 |
| `wework_sync_logs` | 企微同步日志 / 回调处理日志 | 必需 |

以下为建议首期一起建，但可标记部分字段为预留：

| 表名 | 用途 | 建议 |
|---|---|---|
| `store_rules` | 门店排班规则参数表 | 建议首期建，避免后续硬编码迁移 |
| `wework_approval_sync_cursor` | 拉取企微审批的游标/窗口状态 | 建议首期建 |
| `swap_requests` | 换班申请（P1） | 可预建表，功能后开 |

---

## 4. ER 关系概览

```text
users 1 ─── n store_staffs n ─── 1 stores
stores 1 ─── n shift_templates
stores 1 ─── n schedule_batches
schedule_batches 1 ─── n schedule_entries
users 1 ─── n schedule_entries
users 1 ─── n leave_records
stores 1 ─── n leave_records
stores 1 ─── n approval_requests
schedule_batches 1 ─── n approval_requests
approval_requests 1 ─── n approval_actions
users 1 ─── n approval_actions
stores 1 ─── 1 store_rules
```

说明：

- `users` 是“人”的主表；
- `store_staffs` 是“人在某门店任职”的关系表；
- `schedule_batches` 管一周排班；
- `schedule_entries` 是实际班表明细；
- `leave_records` 记录企微同步到 Atlas 的已通过请假；
- `approval_requests` / `approval_actions` 管 Atlas 内部特殊排班审批；
- `wework_sync_logs` 用于排查同步问题，不直接参与业务关系，但属于关键运维表。

---

## 5. 表设计详情

---

## 5.1 `users` 用户主表

### 5.1.1 用途

存储 Atlas 本地用户资料，承接：

- 企微身份映射
- 系统角色
- 登录状态
- 基础员工信息

> 注意：不要把“门店归属”只绑死在 `users.store_id` 上。因为真实业务里员工可能调店、兼职多店、历史归属要追踪，所以使用 `store_staffs` 做关系更稳。

### 5.1.2 建议字段

| 字段 | 类型 | 说明 | MVP |
|---|---|---|---|
| `id` | BIGINT UNSIGNED PK | 用户主键 | 必选 |
| `wework_user_id` | VARCHAR(64) | 企微用户 ID，外部唯一标识 | 必选 |
| `name` | VARCHAR(64) | 姓名 | 必选 |
| `mobile` | VARCHAR(32) | 手机号 | 预留 |
| `avatar_url` | VARCHAR(255) | 头像 URL | 预留 |
| `gender` | TINYINT | 性别：0未知/1男/2女 | 预留 |
| `role` | VARCHAR(32) | 系统角色：`employee`/`manager`/`operation_manager`/`admin` | 必选 |
| `employment_type` | VARCHAR(32) | 用工类型：`full_time`/`part_time`/`intern` | 预留 |
| `status` | VARCHAR(32) | `active`/`inactive`/`left`/`pending_activation` | 必选 |
| `joined_at` | DATETIME | 入职时间，用于判断新员工首周 | 必选 |
| `left_at` | DATETIME | 离职时间 | 预留 |
| `last_login_at` | DATETIME | 最后登录时间 | 预留 |
| `created_at` | DATETIME | 创建时间 | 必选 |
| `updated_at` | DATETIME | 更新时间 | 必选 |

### 5.1.3 约束与索引

- 主键：`PRIMARY KEY (id)`
- 唯一索引：`UNIQUE KEY uk_users_wework_user_id (wework_user_id)`
- 普通索引：
  - `KEY idx_users_role_status (role, status)`
  - `KEY idx_users_joined_at (joined_at)`

### 5.1.4 设计说明

- `joined_at` 是 MVP 必选，因为 PRD 明确要求处理“新员工首周排班”规则；
- `role` 目前采用单值角色足够支撑 MVP；如果后续要支持一个人多角色，再拆 `user_roles`；
- `mobile/avatar_url/gender` 都可从企微补充，但不是主链路刚需。

---

## 5.2 `stores` 门店表

### 5.2.1 用途

存储门店主数据，包含品牌类型、负责人、状态等。

### 5.2.2 建议字段

| 字段 | 类型 | 说明 | MVP |
|---|---|---|---|
| `id` | BIGINT UNSIGNED PK | 门店主键 | 必选 |
| `code` | VARCHAR(64) | 门店编码，业务唯一 | 必选 |
| `name` | VARCHAR(128) | 门店名称 | 必选 |
| `brand_type` | VARCHAR(32) | 品牌类型：`normal` / `mikoshi_icecream` | 必选 |
| `address` | VARCHAR(255) | 门店地址 | 预留 |
| `manager_user_id` | BIGINT UNSIGNED | 门店店长用户 ID | 必选 |
| `operation_manager_user_id` | BIGINT UNSIGNED | 运营经理用户 ID | 必选 |
| `status` | VARCHAR(32) | `active` / `inactive` / `closed` | 必选 |
| `opened_at` | DATETIME | 开店时间 | 预留 |
| `created_at` | DATETIME | 创建时间 | 必选 |
| `updated_at` | DATETIME | 更新时间 | 必选 |

### 5.2.3 主外键

- 主键：`PRIMARY KEY (id)`
- 外键：
  - `manager_user_id -> users.id`
  - `operation_manager_user_id -> users.id`

### 5.2.4 索引建议

- `UNIQUE KEY uk_stores_code (code)`
- `KEY idx_stores_brand_status (brand_type, status)`
- `KEY idx_stores_manager_user_id (manager_user_id)`
- `KEY idx_stores_operation_manager_user_id (operation_manager_user_id)`

### 5.2.5 设计说明

- PRD 明确存在普通品牌与蜜可诗冰淇淋两类人数规则，因此 `brand_type` 是 MVP 必选；
- 门店负责人直接挂在门店表上，方便快速查询和审批路由；
- 地址不是主链路刚需，可预留。

---

## 5.3 `store_staffs` 门店员工关系表

### 5.3.1 用途

表示“某用户在某门店任职”的关系。该表是 MVP 很值得上的表，不建议偷懒省掉。

它解决的问题：

- 员工可能调店；
- 以后可能出现一人多店；
- 要记录员工在门店的岗位状态；
- 排班、请假、统计都更容易按门店维度追踪。

### 5.3.2 建议字段

| 字段 | 类型 | 说明 | MVP |
|---|---|---|---|
| `id` | BIGINT UNSIGNED PK | 主键 | 必选 |
| `store_id` | BIGINT UNSIGNED | 门店 ID | 必选 |
| `user_id` | BIGINT UNSIGNED | 用户 ID | 必选 |
| `job_title` | VARCHAR(64) | 岗位，如店员/店长 | 预留 |
| `is_primary` | TINYINT(1) | 是否主门店：1是/0否 | 必选 |
| `status` | VARCHAR(32) | `active` / `inactive` / `transferred_out` | 必选 |
| `joined_at` | DATETIME | 到该门店任职时间 | 必选 |
| `left_at` | DATETIME | 离开该门店时间 | 预留 |
| `created_at` | DATETIME | 创建时间 | 必选 |
| `updated_at` | DATETIME | 更新时间 | 必选 |

### 5.3.3 主外键

- `store_id -> stores.id`
- `user_id -> users.id`

### 5.3.4 索引建议

- `UNIQUE KEY uk_store_staffs_store_user (store_id, user_id)`
- `KEY idx_store_staffs_user_status (user_id, status)`
- `KEY idx_store_staffs_store_status (store_id, status)`
- 如 MySQL 方案允许，可通过业务约束保证：每个 `user_id` 只有一个 `is_primary=1 and status=active`

### 5.3.5 设计说明

- 虽然 `stores.manager_user_id` 已能表示店长，但员工归属仍应落在关系表里；
- 后续如果店长也是普通员工，只需在该表保留记录，不冲突；
- 这张表会被排班可选员工列表、请假归属门店判断、数据权限查询频繁使用。

---

## 5.4 `store_rules` 门店规则表

### 5.4.1 用途

保存门店级排班规则配置，避免人数规则、新员工规则、未来动态规则写死在代码里。

### 5.4.2 建议字段

| 字段 | 类型 | 说明 | MVP |
|---|---|---|---|
| `id` | BIGINT UNSIGNED PK | 主键 | 必选 |
| `store_id` | BIGINT UNSIGNED | 门店 ID | 必选 |
| `default_min_staff` | INT | 默认最小在岗人数 | 必选 |
| `default_max_staff` | INT | 默认最大在岗人数 | 必选 |
| `new_staff_protection_days` | INT | 新员工保护天数，如 7 天 | 必选 |
| `allow_overtime` | TINYINT(1) | 是否允许加班排班 | 预留 |
| `allow_understaff_with_approval` | TINYINT(1) | 是否允许低于最小人数后走审批 | 必选 |
| `allow_overstaff_with_approval` | TINYINT(1) | 是否允许高于满编后走审批 | 必选 |
| `special_rules_json` | JSON | 特殊规则扩展 | 预留 |
| `created_at` | DATETIME | 创建时间 | 必选 |
| `updated_at` | DATETIME | 更新时间 | 必选 |

### 5.4.3 主外键

- `store_id -> stores.id`

### 5.4.4 索引建议

- `UNIQUE KEY uk_store_rules_store_id (store_id)`

### 5.4.5 设计说明

- 这张表不是“绝对必需才能跑起来”，但从开发角度，我建议 MVP 就建；
- 否则人数规则一定会散落在代码和前端页面里，后面变更会很痛；
- `special_rules_json` 先预留，适合未来放促销季/节假日等特殊策略。

---

## 5.5 `shift_templates` 班次模板表

### 5.5.1 用途

定义门店可用班次模板，比如：早班 / 中班 / 晚班 / 闭店班。

### 5.5.2 建议字段

| 字段 | 类型 | 说明 | MVP |
|---|---|---|---|
| `id` | BIGINT UNSIGNED PK | 主键 | 必选 |
| `store_id` | BIGINT UNSIGNED | 门店 ID | 必选 |
| `code` | VARCHAR(64) | 班次编码 | 必选 |
| `name` | VARCHAR(64) | 班次名称 | 必选 |
| `start_time` | TIME | 班次开始时间 | 必选 |
| `end_time` | TIME | 班次结束时间 | 必选 |
| `cross_day` | TINYINT(1) | 是否跨天 | 预留 |
| `min_staff` | INT | 该班次最少人数 | 必选 |
| `max_staff` | INT | 该班次最多人数 | 必选 |
| `required_skill_json` | JSON | 技能要求，如值班/收银 | 预留 |
| `status` | VARCHAR(32) | `active` / `inactive` | 必选 |
| `sort_order` | INT | 排序值 | 预留 |
| `created_at` | DATETIME | 创建时间 | 必选 |
| `updated_at` | DATETIME | 更新时间 | 必选 |

### 5.5.3 主外键

- `store_id -> stores.id`

### 5.5.4 索引建议

- `UNIQUE KEY uk_shift_templates_store_code (store_id, code)`
- `KEY idx_shift_templates_store_status (store_id, status)`

### 5.5.5 设计说明

- 架构文档明确建议“人数上下限放到班次级而非仅门店级”，这个判断是对的；
- 因为同一门店不同时间段的人数要求会不同；
- `cross_day`、`required_skill_json` 先预留，不阻塞 MVP。

---

## 5.6 `schedule_batches` 排班批次表

### 5.6.1 用途

一周排班通常是批量创建、批量校验、批量提交审批、批量发布，所以必须有批次表，不建议直接只有明细表。

### 5.6.2 建议字段

| 字段 | 类型 | 说明 | MVP |
|---|---|---|---|
| `id` | BIGINT UNSIGNED PK | 主键 | 必选 |
| `store_id` | BIGINT UNSIGNED | 门店 ID | 必选 |
| `week_start_date` | DATE | 周开始日期 | 必选 |
| `week_end_date` | DATE | 周结束日期 | 必选 |
| `status` | VARCHAR(32) | `draft` / `pending_approval` / `approved` / `published` / `cancelled` | 必选 |
| `version` | INT | 批次版本号，默认 1 | 必选 |
| `validation_status` | VARCHAR(32) | `not_checked` / `passed` / `failed` / `warning` | 必选 |
| `validation_summary_json` | JSON | 校验摘要 | 预留 |
| `requires_approval` | TINYINT(1) | 是否需特殊审批 | 必选 |
| `created_by` | BIGINT UNSIGNED | 创建人 | 必选 |
| `submitted_by` | BIGINT UNSIGNED | 提审人 | 预留 |
| `submitted_at` | DATETIME | 提审时间 | 预留 |
| `published_by` | BIGINT UNSIGNED | 发布人 | 预留 |
| `published_at` | DATETIME | 发布时间 | 预留 |
| `remark` | VARCHAR(500) | 备注 | 预留 |
| `created_at` | DATETIME | 创建时间 | 必选 |
| `updated_at` | DATETIME | 更新时间 | 必选 |

### 5.6.3 主外键

- `store_id -> stores.id`
- `created_by -> users.id`
- `submitted_by -> users.id`
- `published_by -> users.id`

### 5.6.4 索引建议

- `UNIQUE KEY uk_schedule_batches_store_week_version (store_id, week_start_date, version)`
- `KEY idx_schedule_batches_store_status (store_id, status)`
- `KEY idx_schedule_batches_week_range (week_start_date, week_end_date)`

### 5.6.5 设计说明

- `version` 建议 MVP 就带上，避免重排一周班表时覆盖历史；
- `validation_status` / `requires_approval` 有助于前端快速展示当前批次状态；
- `validation_summary_json` 先预留，后端可逐步沉淀校验摘要。

---

## 5.7 `schedule_entries` 排班明细表

### 5.7.1 用途

存储实际排班结果，是核心事实表。

每一条记录表示：**某员工在某天被安排到某个班次**。

### 5.7.2 建议字段

| 字段 | 类型 | 说明 | MVP |
|---|---|---|---|
| `id` | BIGINT UNSIGNED PK | 主键 | 必选 |
| `batch_id` | BIGINT UNSIGNED | 排班批次 ID | 必选 |
| `store_id` | BIGINT UNSIGNED | 门店 ID | 必选 |
| `user_id` | BIGINT UNSIGNED | 员工用户 ID | 必选 |
| `shift_template_id` | BIGINT UNSIGNED | 班次模板 ID | 必选 |
| `schedule_date` | DATE | 排班日期 | 必选 |
| `start_at` | DATETIME | 实际开始时间 | 必选 |
| `end_at` | DATETIME | 实际结束时间 | 必选 |
| `status` | VARCHAR(32) | `draft` / `pending_approval` / `approved` / `published` / `cancelled` | 必选 |
| `source` | VARCHAR(32) | `manual` / `copied` / `adjusted` / `system_generated` | 必选 |
| `exception_flags_json` | JSON | 例外命中标记 | 预留 |
| `remark` | VARCHAR(500) | 备注 | 预留 |
| `created_by` | BIGINT UNSIGNED | 创建人 | 必选 |
| `updated_by` | BIGINT UNSIGNED | 更新人 | 预留 |
| `created_at` | DATETIME | 创建时间 | 必选 |
| `updated_at` | DATETIME | 更新时间 | 必选 |

### 5.7.3 主外键

- `batch_id -> schedule_batches.id`
- `store_id -> stores.id`
- `user_id -> users.id`
- `shift_template_id -> shift_templates.id`
- `created_by -> users.id`
- `updated_by -> users.id`

### 5.7.4 索引建议

- `UNIQUE KEY uk_schedule_entries_unique_shift (user_id, schedule_date, shift_template_id, batch_id)`
- `KEY idx_schedule_entries_store_date (store_id, schedule_date)`
- `KEY idx_schedule_entries_user_date (user_id, schedule_date)`
- `KEY idx_schedule_entries_batch_id (batch_id)`
- `KEY idx_schedule_entries_shift_date (shift_template_id, schedule_date)`
- 如需要做时间冲突检测优化，可加：`KEY idx_schedule_entries_user_time (user_id, start_at, end_at)`

### 5.7.5 设计说明

- `start_at/end_at` 不要只依赖模板时间动态拼接，直接落库更适合后续调班/特殊班次；
- `source` 用来区分手工排班、复制上周、人工调整、系统建议生成；
- `exception_flags_json` 适合存储：
  - `understaffed`
  - `overstaffed`
  - `leave_conflict`
  - `new_staff_first_week`
  - `forced_transfer`
  等规则命中情况。

---

## 5.8 `leave_records` 请假记录表

### 5.8.1 用途

存储从企微审批同步过来的已通过请假，是排班冲突校验的关键事实表。

### 5.8.2 建议字段

| 字段 | 类型 | 说明 | MVP |
|---|---|---|---|
| `id` | BIGINT UNSIGNED PK | 主键 | 必选 |
| `user_id` | BIGINT UNSIGNED | 本地用户 ID | 必选 |
| `store_id` | BIGINT UNSIGNED | 请假时归属门店 ID | 必选 |
| `wework_user_id` | VARCHAR(64) | 企微用户 ID | 必选 |
| `wework_approval_instance_id` | VARCHAR(128) | 企微审批实例 ID | 必选 |
| `wework_template_id` | VARCHAR(128) | 审批模板 ID | 必选 |
| `leave_type` | VARCHAR(64) | 请假类型，如事假/病假 | 必选 |
| `start_time` | DATETIME | 请假开始时间 | 必选 |
| `end_time` | DATETIME | 请假结束时间 | 必选 |
| `duration_hours` | DECIMAL(8,2) | 请假时长（小时） | 必选 |
| `approval_status` | VARCHAR(32) | `approved` / `revoked` / `partially_revoked` | 必选 |
| `sync_source` | VARCHAR(32) | `callback` / `polling` / `manual_retry` | 必选 |
| `sync_version` | INT | 同一审批实例同步版本 | 预留 |
| `raw_payload` | JSON | 企微原始报文 | 必选 |
| `synced_at` | DATETIME | 最近同步时间 | 必选 |
| `created_at` | DATETIME | 创建时间 | 必选 |
| `updated_at` | DATETIME | 更新时间 | 必选 |

### 5.8.3 主外键

- `user_id -> users.id`
- `store_id -> stores.id`

### 5.8.4 索引建议

- `UNIQUE KEY uk_leave_records_instance_id (wework_approval_instance_id)`
- `KEY idx_leave_records_user_time (user_id, start_time, end_time)`
- `KEY idx_leave_records_store_time (store_id, start_time, end_time)`
- `KEY idx_leave_records_wework_user_id (wework_user_id)`
- `KEY idx_leave_records_status_synced (approval_status, synced_at)`

### 5.8.5 设计说明

- `wework_approval_instance_id` 必须唯一，保证幂等；
- `raw_payload` MVP 必选，排查企微审批字段变化时非常关键；
- `approval_status` 不能只存 approved，后续可能有撤销或更新，MVP 先预留状态值更稳；
- `store_id` 虽然理论上能通过用户关系推导，但直接落库对统计和追查都更省事。

---

## 5.9 `approval_requests` 特殊排班审批主表

### 5.9.1 用途

记录 Atlas 系统内部的“特殊排班审批”。

注意这不是企微请假审批表，而是：

- 低于最小人数
- 超过最大人数
- 临时调班（非自愿）
- 加班 / 减班
- 新员工首周排班
- 促销/旺季特殊安排

这些 Atlas 排班异常场景的审批记录。

### 5.9.2 建议字段

| 字段 | 类型 | 说明 | MVP |
|---|---|---|---|
| `id` | BIGINT UNSIGNED PK | 主键 | 必选 |
| `request_no` | VARCHAR(64) | 审批单号 | 必选 |
| `type` | VARCHAR(32) | `schedule_exception` | 必选 |
| `store_id` | BIGINT UNSIGNED | 门店 ID | 必选 |
| `schedule_batch_id` | BIGINT UNSIGNED | 对应排班批次 | 必选 |
| `submitted_by` | BIGINT UNSIGNED | 提交人（一般为店长） | 必选 |
| `current_approver_id` | BIGINT UNSIGNED | 当前审批人（运营经理） | 必选 |
| `status` | VARCHAR(32) | `pending` / `approved` / `rejected` / `cancelled` | 必选 |
| `trigger_reasons_json` | JSON | 触发原因列表 | 必选 |
| `risk_summary` | VARCHAR(500) | 风险摘要 | 预留 |
| `comment` | VARCHAR(1000) | 提交说明 | 预留 |
| `approved_at` | DATETIME | 审批通过时间 | 预留 |
| `rejected_at` | DATETIME | 驳回时间 | 预留 |
| `created_at` | DATETIME | 创建时间 | 必选 |
| `updated_at` | DATETIME | 更新时间 | 必选 |

### 5.9.3 主外键

- `store_id -> stores.id`
- `schedule_batch_id -> schedule_batches.id`
- `submitted_by -> users.id`
- `current_approver_id -> users.id`

### 5.9.4 索引建议

- `UNIQUE KEY uk_approval_requests_request_no (request_no)`
- `KEY idx_approval_requests_store_status (store_id, status)`
- `KEY idx_approval_requests_approver_status (current_approver_id, status)`
- `KEY idx_approval_requests_batch_id (schedule_batch_id)`
- `KEY idx_approval_requests_created_at (created_at)`

### 5.9.5 设计说明

- 审批主表只存“当前态”和核心概览；
- 审批动作过程不要硬塞这里，应该拆到 `approval_actions`；
- `trigger_reasons_json` 建议使用数组，内容示例：

```json
[
  { "code": "UNDER_MIN_STAFF", "message": "2026-03-15 早班人数低于最小值 3" },
  { "code": "NEW_STAFF_FIRST_WEEK", "message": "员工张三处于入职首周" }
]
```

---

## 5.10 `approval_actions` 审批动作流水表

### 5.10.1 用途

记录审批过程动作，支撑审计与详情页展示。

### 5.10.2 建议字段

| 字段 | 类型 | 说明 | MVP |
|---|---|---|---|
| `id` | BIGINT UNSIGNED PK | 主键 | 必选 |
| `approval_request_id` | BIGINT UNSIGNED | 审批主表 ID | 必选 |
| `action` | VARCHAR(32) | `submit` / `approve` / `reject` / `cancel` | 必选 |
| `actor_user_id` | BIGINT UNSIGNED | 操作人 | 必选 |
| `comment` | VARCHAR(1000) | 审批意见 | 预留 |
| `snapshot_json` | JSON | 当时审批上下文快照 | 预留 |
| `created_at` | DATETIME | 动作时间 | 必选 |

### 5.10.3 主外键

- `approval_request_id -> approval_requests.id`
- `actor_user_id -> users.id`

### 5.10.4 索引建议

- `KEY idx_approval_actions_request_id (approval_request_id)`
- `KEY idx_approval_actions_actor_time (actor_user_id, created_at)`

### 5.10.5 设计说明

- 审批流水一定要单独建，否则后面无法追踪“谁在什么时候做了什么”；
- `snapshot_json` 不是 MVP 必选，但很有用，适合保留当时触发规则摘要与相关排班统计。

---

## 5.11 `wework_sync_logs` 企微同步日志表

### 5.11.1 用途

记录企微回调、用户同步、请假同步的请求与处理结果，用于：

- 失败排查
- 人工重试
- 幂等核查
- 观察企微字段变化

### 5.11.2 建议字段

| 字段 | 类型 | 说明 | MVP |
|---|---|---|---|
| `id` | BIGINT UNSIGNED PK | 主键 | 必选 |
| `biz_type` | VARCHAR(32) | `user_sync` / `leave_sync` / `approval_callback` / `message_send` | 必选 |
| `biz_key` | VARCHAR(128) | 业务唯一键，如审批实例 ID | 必选 |
| `request_payload` | JSON | 请求体/回调体 | 必选 |
| `response_payload` | JSON | 企微返回或处理结果 | 预留 |
| `result` | VARCHAR(32) | `success` / `failed` / `ignored` | 必选 |
| `error_code` | VARCHAR(64) | 错误码 | 预留 |
| `error_message` | VARCHAR(500) | 错误信息 | 预留 |
| `retry_count` | INT | 重试次数 | 预留 |
| `processed_at` | DATETIME | 处理时间 | 必选 |
| `created_at` | DATETIME | 创建时间 | 必选 |

### 5.11.3 索引建议

- `KEY idx_wework_sync_logs_biz_type_key (biz_type, biz_key)`
- `KEY idx_wework_sync_logs_result_time (result, processed_at)`
- `KEY idx_wework_sync_logs_created_at (created_at)`

### 5.11.4 设计说明

- 这是运维生命线，MVP 不能省；
- 日志表不是为了“看起来专业”，而是因为企微集成类问题不留原始数据基本没法排；
- 如担心体积增长，可后续做归档，不影响首期设计。

---

## 5.12 `wework_approval_sync_cursor` 企微审批同步游标表

### 5.12.1 用途

保存定时拉取企微审批数据的窗口状态，支持“回调为主、定时补偿为辅”的策略。

### 5.12.2 建议字段

| 字段 | 类型 | 说明 | MVP |
|---|---|---|---|
| `id` | BIGINT UNSIGNED PK | 主键 | 必选 |
| `sync_type` | VARCHAR(32) | `leave_approval` | 必选 |
| `cursor_key` | VARCHAR(128) | 游标键，如模板维度/租户维度 | 必选 |
| `last_success_time` | DATETIME | 最近成功同步到的时间点 | 必选 |
| `last_success_cursor` | VARCHAR(255) | 最近成功游标 | 预留 |
| `last_run_status` | VARCHAR(32) | `success` / `failed` | 必选 |
| `last_error_message` | VARCHAR(500) | 最近错误信息 | 预留 |
| `updated_at` | DATETIME | 更新时间 | 必选 |
| `created_at` | DATETIME | 创建时间 | 必选 |

### 5.12.3 索引建议

- `UNIQUE KEY uk_wework_sync_cursor_type_key (sync_type, cursor_key)`

### 5.12.4 设计说明

- 这张表主要服务定时补偿；
- 不建也能做，但补偿逻辑会散在 Redis 或代码里，不利于恢复；
- 我建议首期就建。

---

## 5.13 `swap_requests` 换班申请表（P1 预留）

### 5.13.1 用途

用于 P1 的员工换班申请。

### 5.13.2 建议字段

| 字段 | 类型 | 说明 | MVP |
|---|---|---|---|
| `id` | BIGINT UNSIGNED PK | 主键 | 预留 |
| `request_no` | VARCHAR(64) | 申请单号 | 预留 |
| `store_id` | BIGINT UNSIGNED | 门店 ID | 预留 |
| `from_user_id` | BIGINT UNSIGNED | 发起人 | 预留 |
| `to_user_id` | BIGINT UNSIGNED | 目标换班人 | 预留 |
| `from_schedule_entry_id` | BIGINT UNSIGNED | 原班次 | 预留 |
| `target_schedule_entry_id` | BIGINT UNSIGNED | 目标班次 | 预留 |
| `status` | VARCHAR(32) | `pending` / `approved` / `rejected` / `cancelled` | 预留 |
| `reason` | VARCHAR(500) | 原因 | 预留 |
| `approved_by` | BIGINT UNSIGNED | 审批人（店长） | 预留 |
| `approved_at` | DATETIME | 审批时间 | 预留 |
| `created_at` | DATETIME | 创建时间 | 预留 |
| `updated_at` | DATETIME | 更新时间 | 预留 |

### 5.13.3 设计说明

- PRD 中换班申请是 P1，所以此表不是 MVP 主链路必需；
- 但如果团队预计 Sprint 2/3 就上，可以提前建表，后续少一次迁移。

---

## 6. 主外键关系清单

为便于后端直接建模，这里单独列一份清单。

### 6.1 主键

| 表名 | 主键 |
|---|---|
| `users` | `id` |
| `stores` | `id` |
| `store_staffs` | `id` |
| `store_rules` | `id` |
| `shift_templates` | `id` |
| `schedule_batches` | `id` |
| `schedule_entries` | `id` |
| `leave_records` | `id` |
| `approval_requests` | `id` |
| `approval_actions` | `id` |
| `wework_sync_logs` | `id` |
| `wework_approval_sync_cursor` | `id` |
| `swap_requests` | `id` |

### 6.2 外键

| 子表 | 字段 | 指向 |
|---|---|---|
| `stores` | `manager_user_id` | `users.id` |
| `stores` | `operation_manager_user_id` | `users.id` |
| `store_staffs` | `store_id` | `stores.id` |
| `store_staffs` | `user_id` | `users.id` |
| `store_rules` | `store_id` | `stores.id` |
| `shift_templates` | `store_id` | `stores.id` |
| `schedule_batches` | `store_id` | `stores.id` |
| `schedule_batches` | `created_by` | `users.id` |
| `schedule_batches` | `submitted_by` | `users.id` |
| `schedule_batches` | `published_by` | `users.id` |
| `schedule_entries` | `batch_id` | `schedule_batches.id` |
| `schedule_entries` | `store_id` | `stores.id` |
| `schedule_entries` | `user_id` | `users.id` |
| `schedule_entries` | `shift_template_id` | `shift_templates.id` |
| `schedule_entries` | `created_by` | `users.id` |
| `schedule_entries` | `updated_by` | `users.id` |
| `leave_records` | `user_id` | `users.id` |
| `leave_records` | `store_id` | `stores.id` |
| `approval_requests` | `store_id` | `stores.id` |
| `approval_requests` | `schedule_batch_id` | `schedule_batches.id` |
| `approval_requests` | `submitted_by` | `users.id` |
| `approval_requests` | `current_approver_id` | `users.id` |
| `approval_actions` | `approval_request_id` | `approval_requests.id` |
| `approval_actions` | `actor_user_id` | `users.id` |
| `swap_requests` | `store_id` | `stores.id` |
| `swap_requests` | `from_user_id` | `users.id` |
| `swap_requests` | `to_user_id` | `users.id` |
| `swap_requests` | `from_schedule_entry_id` | `schedule_entries.id` |
| `swap_requests` | `target_schedule_entry_id` | `schedule_entries.id` |
| `swap_requests` | `approved_by` | `users.id` |

---

## 7. 索引设计建议汇总

### 7.1 唯一索引

| 表名 | 索引 | 目的 |
|---|---|---|
| `users` | `uk_users_wework_user_id (wework_user_id)` | 企微身份唯一 |
| `stores` | `uk_stores_code (code)` | 门店编码唯一 |
| `store_staffs` | `uk_store_staffs_store_user (store_id, user_id)` | 防止重复任职关系 |
| `store_rules` | `uk_store_rules_store_id (store_id)` | 每店一套门店规则 |
| `shift_templates` | `uk_shift_templates_store_code (store_id, code)` | 门店班次编码唯一 |
| `schedule_batches` | `uk_schedule_batches_store_week_version (store_id, week_start_date, version)` | 批次版本唯一 |
| `leave_records` | `uk_leave_records_instance_id (wework_approval_instance_id)` | 请假同步幂等 |
| `approval_requests` | `uk_approval_requests_request_no (request_no)` | 审批单号唯一 |
| `wework_approval_sync_cursor` | `uk_wework_sync_cursor_type_key (sync_type, cursor_key)` | 同步游标唯一 |

### 7.2 高优先级查询索引

| 表名 | 索引 | 典型查询 |
|---|---|---|
| `schedule_entries` | `(store_id, schedule_date)` | 查某店某日/某周班表 |
| `schedule_entries` | `(user_id, schedule_date)` | 员工查看个人班表 |
| `schedule_entries` | `(batch_id)` | 根据批次查明细 |
| `leave_records` | `(user_id, start_time, end_time)` | 排班时做请假冲突检测 |
| `leave_records` | `(store_id, start_time, end_time)` | 查某店时间范围内请假 |
| `approval_requests` | `(current_approver_id, status)` | 查运营经理待审批列表 |
| `schedule_batches` | `(store_id, status)` | 查门店当前排班批次 |
| `store_staffs` | `(store_id, status)` | 查门店在职员工 |

### 7.3 不建议过早加太多索引的地方

- `wework_sync_logs.request_payload`
- `leave_records.raw_payload`
- `approval_actions.snapshot_json`

这些字段偏排障用途，不建议首期做 JSON path 索引，先保持简单。

---

## 8. 关键业务场景与落库说明

---

## 8.1 企微用户同步 / 登录

### 场景

- 企微 OAuth 登录
- 通讯录同步
- 本地用户开通

### 涉及表

- `users`
- `store_staffs`
- `wework_sync_logs`

### 落库要点

1. 通过 `wework_user_id` 匹配 `users`；
2. 若用户存在但 `status = pending_activation`，登录后只允许进入待开通页面；
3. 若通讯录同步到了用户基础资料，同时刷新 `name/mobile/avatar_url` 等非关键字段；
4. 同步过程写 `wework_sync_logs`。

---

## 8.2 门店员工排班

### 场景

店长为某门店创建一周班表。

### 涉及表

- `stores`
- `store_staffs`
- `shift_templates`
- `schedule_batches`
- `schedule_entries`
- `store_rules`

### 落库要点

1. 创建 `schedule_batches` 草稿；
2. 批量写入 `schedule_entries`；
3. 校验人数上下限、重复排班、请假冲突、新员工首周；
4. 命中例外规则则 `schedule_batches.requires_approval = 1`；
5. 若不需审批，可直接发布；若需审批，则进入 `approval_requests`。

---

## 8.3 企微请假同步

### 场景

企微审批通过后，Atlas 通过回调或补偿任务同步请假。

### 涉及表

- `leave_records`
- `users`
- `store_staffs`
- `wework_sync_logs`
- `wework_approval_sync_cursor`

### 落库要点

1. 通过 `wework_approval_instance_id` 做幂等 upsert；
2. 通过 `wework_user_id` 找到 `users.id`；
3. 通过用户当前主门店或审批发生时归属门店写 `store_id`；
4. 保存 `raw_payload`；
5. 处理结果写同步日志；
6. 定时任务成功后更新 `wework_approval_sync_cursor`。

---

## 8.4 特殊排班审批

### 场景

店长提交例外排班，运营经理审批。

### 涉及表

- `approval_requests`
- `approval_actions`
- `schedule_batches`
- `schedule_entries`

### 落库要点

1. 新建 `approval_requests`，状态 `pending`；
2. 写一条 `approval_actions(action=submit)`；
3. 运营经理审批通过：
   - `approval_requests.status = approved`
   - 写 `approval_actions(action=approve)`
   - `schedule_batches.status` 可转为 `approved` 或直接 `published`（视流程实现）
4. 审批拒绝：
   - `approval_requests.status = rejected`
   - 对应批次保留在草稿态或驳回态。

---

## 9. MVP 必选字段与预留字段汇总

---

## 9.1 必须落地的 MVP 关键字段

以下字段如果缺失，会直接影响主链路，不建议省。

### 用户与门店

- `users.wework_user_id`
- `users.name`
- `users.role`
- `users.status`
- `users.joined_at`
- `stores.code`
- `stores.name`
- `stores.brand_type`
- `stores.manager_user_id`
- `stores.operation_manager_user_id`
- `store_staffs.store_id`
- `store_staffs.user_id`
- `store_staffs.is_primary`
- `store_staffs.status`

### 排班

- `shift_templates.store_id`
- `shift_templates.name`
- `shift_templates.start_time`
- `shift_templates.end_time`
- `shift_templates.min_staff`
- `shift_templates.max_staff`
- `schedule_batches.store_id`
- `schedule_batches.week_start_date`
- `schedule_batches.week_end_date`
- `schedule_batches.status`
- `schedule_batches.requires_approval`
- `schedule_entries.batch_id`
- `schedule_entries.store_id`
- `schedule_entries.user_id`
- `schedule_entries.shift_template_id`
- `schedule_entries.schedule_date`
- `schedule_entries.start_at`
- `schedule_entries.end_at`
- `schedule_entries.status`

### 请假同步

- `leave_records.user_id`
- `leave_records.store_id`
- `leave_records.wework_user_id`
- `leave_records.wework_approval_instance_id`
- `leave_records.wework_template_id`
- `leave_records.leave_type`
- `leave_records.start_time`
- `leave_records.end_time`
- `leave_records.duration_hours`
- `leave_records.approval_status`
- `leave_records.sync_source`
- `leave_records.raw_payload`
- `leave_records.synced_at`

### 审批

- `approval_requests.request_no`
- `approval_requests.store_id`
- `approval_requests.schedule_batch_id`
- `approval_requests.submitted_by`
- `approval_requests.current_approver_id`
- `approval_requests.status`
- `approval_requests.trigger_reasons_json`
- `approval_actions.approval_request_id`
- `approval_actions.action`
- `approval_actions.actor_user_id`

### 运维 / 集成

- `wework_sync_logs.biz_type`
- `wework_sync_logs.biz_key`
- `wework_sync_logs.request_payload`
- `wework_sync_logs.result`
- `wework_sync_logs.processed_at`

---

## 9.2 可以预留、不阻塞 MVP 的字段

这些字段建议建上，但不要求首批接口全部用到：

- `users.mobile`
- `users.avatar_url`
- `users.gender`
- `users.employment_type`
- `users.left_at`
- `stores.address`
- `stores.opened_at`
- `store_staffs.job_title`
- `store_staffs.left_at`
- `store_rules.special_rules_json`
- `shift_templates.cross_day`
- `shift_templates.required_skill_json`
- `shift_templates.sort_order`
- `schedule_batches.validation_summary_json`
- `schedule_batches.remark`
- `schedule_entries.exception_flags_json`
- `schedule_entries.remark`
- `leave_records.sync_version`
- `approval_requests.risk_summary`
- `approval_requests.comment`
- `approval_actions.comment`
- `approval_actions.snapshot_json`
- `wework_sync_logs.response_payload`
- `wework_sync_logs.error_code`
- `wework_sync_logs.error_message`
- `wework_sync_logs.retry_count`
- `wework_approval_sync_cursor.last_success_cursor`
- `swap_requests` 全表

---

## 10. 命名与实现建议

### 10.1 命名建议

- 表名统一复数：`users`, `stores`, `schedule_entries`
- 状态字段统一用小写枚举字符串，不要混数字魔法值
- JSON 字段统一以 `_json` 结尾
- 外部系统字段统一加前缀：`wework_`

### 10.2 状态值建议

#### 用户状态

- `active`
- `inactive`
- `left`
- `pending_activation`

#### 排班批次 / 明细状态

- `draft`
- `pending_approval`
- `approved`
- `published`
- `cancelled`

#### 审批状态

- `pending`
- `approved`
- `rejected`
- `cancelled`

#### 请假状态

- `approved`
- `revoked`
- `partially_revoked`

### 10.3 审批原因 code 建议

```text
UNDER_MIN_STAFF
OVER_MAX_STAFF
LEAVE_CONFLICT
DUPLICATE_SHIFT
NEW_STAFF_FIRST_WEEK
FORCED_TRANSFER
OVERTIME_REQUIRED
SHIFT_REDUCTION
PROMOTION_SEASON_SPECIAL
```

这些 code 建议前后端共用，避免页面写中文硬编码判断。

---

## 11. 建表优先顺序建议

按 Sprint 实际落地，建议顺序如下：

### Sprint 1

1. `users`
2. `stores`
3. `store_staffs`
4. `store_rules`
5. `shift_templates`
6. `wework_sync_logs`

### Sprint 2

7. `schedule_batches`
8. `schedule_entries`

### Sprint 3

9. `leave_records`
10. `wework_approval_sync_cursor`

### Sprint 4

11. `approval_requests`
12. `approval_actions`
13. `swap_requests`（如 P1 提前）

---

## 12. 最终建议（给开发的结论）

如果只问一句“Atlas 的 MVP 数据库最小闭环应该怎么建”，我的答案是：

### 必须有的 10 张表

1. `users`
2. `stores`
3. `store_staffs`
4. `store_rules`
5. `shift_templates`
6. `schedule_batches`
7. `schedule_entries`
8. `leave_records`
9. `approval_requests`
10. `approval_actions`
11. `wework_sync_logs`

> 严格说是 11 张更合理，因为 `wework_sync_logs` 不该被省掉。

### MVP 最关键的三个设计点

1. **用户和门店不要一对一写死，必须有 `store_staffs`**；
2. **排班必须有批次表 `schedule_batches`，不能只有明细表**；
3. **请假同步必须以 `wework_approval_instance_id` 做唯一幂等键**。

### 这版设计的取舍

- 没有过度抽象成复杂审批引擎；
- 没有为了“以后可能会用”提前造大而全模型；
- 但把后续最容易补不动的地方（门店员工关系、批次管理、同步幂等、审批流水）提前留好了。

这套设计足够支撑 Atlas MVP 开发，并且不会给 Sprint 2~4 挖明显的结构坑。
