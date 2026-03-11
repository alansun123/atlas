# Atlas 技术架构文档

> 项目：Atlas 企微门店智能排班系统  
> 角色：Tech Lead（Colter）  
> 版本：v1.1  
> 更新日期：2026-03-11

---

## 1. 文档目标

本文档基于当前 PRD、Sprint 计划与团队约定，给出一份可直接落地执行的技术架构方案，目标是：

- 让前端、后端、测试能并行开发；
- 明确 MVP 范围，避免一开始做重；
- 把企微登录、请假审批同步、排班校验三条主链路打通；
- 为后续“智能排班建议”保留扩展位，但不在首期过度设计。

---

## 2. 总体架构

### 2.1 技术选型

结合当前团队能力与仓库约定，建议保持轻量、稳定、易交付：

- 前端：Vue 3 + Vite + TypeScript + Vant + Pinia + Vue Router
- 后端：Node.js 20 + Express + TypeScript
- 数据库：MySQL 8
- ORM：Prisma（优先）或 Sequelize（二选一，不要混用）
- 缓存/任务：Redis（建议接入，至少用于 token 缓存、同步任务去重）
- 部署：Ubuntu VPS + Nginx + PM2
- 日志：Winston / Pino 任一，推荐 Pino（更轻）
- API 风格：RESTful
- 鉴权：企微 OAuth 登录 + 自有 JWT Session

> 建议：MVP 阶段优先 Prisma。原因很简单——表结构清晰、迁移直观、对中小项目迭代速度更友好。

### 2.2 系统架构图

```text
┌──────────────────────────────────────────────────────────┐
│                       企业微信                           │
│  OAuth登录 / 通讯录 / 审批回调 / 应用消息通知            │
└───────────────┬───────────────────────────┬──────────────┘
                │                           │
                │ OAuth / API               │ 回调 / 拉取
                ▼                           ▼
┌──────────────────────────────────────────────────────────┐
│                    Atlas Backend                         │
│  Express API + Auth + Schedule + Leave + Approval       │
│  + Wework Integration + Job Scheduler                   │
└───────────────┬───────────────────────────┬──────────────┘
                │                           │
                │ ORM                       │ Cache / Lock / Queue
                ▼                           ▼
┌────────────────────────────┐   ┌─────────────────────────┐
│         MySQL 8            │   │         Redis           │
│ users/stores/schedules...  │   │ token缓存/幂等/任务去重 │
└────────────────────────────┘   └─────────────────────────┘
                ▲
                │ HTTPS API
                │
┌──────────────────────────────────────────────────────────┐
│                    Atlas Web (H5)                        │
│ Vue3 + Vant，运行于企微内网页/H5                         │
│ 员工 / 店长 / 运营经理按角色呈现                         │
└──────────────────────────────────────────────────────────┘
```

### 2.3 核心业务链路

系统首期围绕 3 条主链路建设：

1. **企微登录链路**  
   用户在企微进入 H5 页面 → 获取授权 code → 后端换取 userid → 建立本地用户会话 → 返回 JWT。

2. **排班创建链路**  
   店长选择门店、日期、班次、员工 → 后端校验人数上下限、重复排班、请假冲突、新员工首周等规则 → 若命中例外规则则进入审批 → 否则直接发布。

3. **请假同步链路**  
   系统通过企微审批回调或定时拉取，获取“请假审批实例”的最新状态 → 幂等落库到本地 `leave_records` → 反向影响排班校验与展示。

### 2.4 架构原则

- **先规则化，再智能化**：MVP 不做复杂 AI 自动排班，只做“规则校验 + 半自动辅助”。
- **企微为身份源与请假事实源**：员工身份和请假审批结果优先以企微为准。
- **本地系统为排班事实源**：班表、换班、特殊审批状态以 Atlas 为准。
- **同步幂等**：企微审批回调、定时补偿拉取都必须支持重复消费。
- **前后端边界清晰**：前端只做展示和操作编排，业务规则统一收口后端。

---

## 3. 前后端目录结构

考虑当前仓库还在初始化阶段，建议直接采用 monorepo 轻量结构：

```text
atlas/
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── database.md
│   └── deployment.md
│
├── atlas-web/                         # 前端 H5
│   ├── public/
│   ├── src/
│   │   ├── api/                       # 按业务域拆分请求
│   │   │   ├── auth.ts
│   │   │   ├── me.ts
│   │   │   ├── stores.ts
│   │   │   ├── schedules.ts
│   │   │   ├── leave.ts
│   │   │   ├── swap.ts
│   │   │   └── approvals.ts
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── schedule/
│   │   │   ├── leave/
│   │   │   ├── approval/
│   │   │   └── common/
│   │   ├── composables/
│   │   │   ├── useAuth.ts
│   │   │   ├── useRoleAccess.ts
│   │   │   ├── useCalendar.ts
│   │   │   └── useWeworkEnv.ts
│   │   ├── constants/
│   │   ├── layouts/
│   │   ├── router/
│   │   ├── stores/
│   │   │   ├── auth.ts
│   │   │   ├── user.ts
│   │   │   ├── schedule.ts
│   │   │   └── approval.ts
│   │   ├── types/
│   │   ├── utils/
│   │   ├── views/
│   │   │   ├── employee/
│   │   │   ├── manager/
│   │   │   ├── operation/
│   │   │   └── common/
│   │   ├── App.vue
│   │   └── main.ts
│   ├── .env.development
│   ├── .env.production
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── atlas-server/                      # 后端 API
│   ├── prisma/                        # 若用 Prisma
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── config/
│   │   ├── common/
│   │   │   ├── constants/
│   │   │   ├── errors/
│   │   │   ├── logger/
│   │   │   ├── middleware/
│   │   │   ├── types/
│   │   │   └── utils/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── user/
│   │   │   ├── store/
│   │   │   ├── shift/
│   │   │   ├── schedule/
│   │   │   ├── leave/
│   │   │   ├── approval/
│   │   │   ├── swap/
│   │   │   ├── notification/
│   │   │   └── wework/
│   │   ├── jobs/
│   │   │   ├── leave-sync.job.ts
│   │   │   ├── user-sync.job.ts
│   │   │   └── notification.job.ts
│   │   └── routes/
│   ├── tests/
│   │   ├── integration/
│   │   └── unit/
│   ├── package.json
│   ├── tsconfig.json
│   └── ecosystem.config.js
│
├── scripts/
│   ├── bootstrap.sh
│   ├── deploy.sh
│   └── sync-wework-users.ts
│
├── .editorconfig
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

### 3.1 目录约束

- `atlas-web` 和 `atlas-server` 独立可启动，避免相互污染。
- 业务代码一律按 `modules` 分域组织，不要按 controller/service/model 平铺到根目录。
- 第三方接入统一放 `modules/wework`，不要把企微调用散落各业务模块。
- 所有“规则判断”尽量沉淀到 `schedule/domain` 或 `schedule/service`，不要写在 controller。

---

## 4. 核心模块划分

### 4.1 模块总览

| 模块 | 说明 | MVP优先级 |
|---|---|---|
| auth | 企微登录、本地会话、JWT | P0 |
| user | 用户资料、角色、门店归属 | P0 |
| store | 门店信息、品牌类型、人数规则 | P0 |
| shift | 班次模板、时间段配置 | P0 |
| schedule | 排班创建、编辑、发布、查询 | P0 |
| leave | 本地请假映射、冲突查询、同步状态 | P0 |
| approval | 特殊排班审批流 | P0 |
| wework | OAuth、通讯录同步、审批回调、应用消息 | P0 |
| notification | 排班结果/审批通知 | P1 |
| swap | 员工换班申请 | P1 |
| report | 运营报表、统计分析 | P2 |
| recommendation | 智能排班建议 | P2 |

### 4.2 Auth 模块

职责：

- 接收企微授权 code；
- 调用企微接口获取 `userid`；
- 映射本地用户；
- 签发 JWT 与 refresh token（或服务端 session）；
- 处理角色装载与路由权限依据。

建议接口：

- `GET /api/auth/wework/url`：生成登录地址（如需）
- `POST /api/auth/wework/callback`：code 换用户
- `GET /api/auth/me`：当前登录用户信息
- `POST /api/auth/logout`

### 4.3 Schedule 模块

职责：

- 周排班草稿创建；
- 排班批量发布；
- 日/周/月视图查询；
- 校验与审批联动；
- 发布后通知相关员工。

排班规则建议统一抽象：

- 人数下限校验；
- 人数上限校验；
- 员工请假冲突；
- 员工同时间重复排班；
- 新员工首周特殊规则；
- 临时调班 / 加班 / 减班例外规则。

### 4.4 Leave 模块

职责：

- 存储企微同步来的请假数据快照；
- 提供按员工、按门店、按日期区间查询；
- 为排班模块提供冲突校验能力；
- 记录同步来源、状态、更新时间。

注意：

MVP 阶段 **不建议** 在 Atlas 内再做一套独立请假审批流；员工发起请假应跳转企微审批，Atlas 只做同步与展示。

### 4.5 Approval 模块

职责：

- 承接“特殊排班”审批；
- 支持店长提交、运营经理审批；
- 记录审批原因、审批意见、最终结果；
- 审批通过后自动落库班表。

审批触发条件来自 PRD：

- 低于最小在店人数；
- 高于满编人数；
- 临时调班（非自愿）；
- 加班/减少班次；
- 新员工首周排班；
- 促销/旺季特殊安排。

### 4.6 Wework 模块

职责：

- 企微 OAuth 登录；
- 通讯录同步；
- 审批回调验签、解密、解析；
- 请假审批单同步；
- 企微应用消息通知。

这个模块是 Atlas 的关键基础设施模块，必须与业务模块解耦，避免 schedule/leave 模块直接拼企微 API。

---

## 5. 企微登录 / 请假审批同步接入方案

这是 Atlas 最关键的外部系统接入，建议分两条链路建设。

### 5.1 企微登录接入方案

#### 5.1.1 登录流程

```text
用户在企微中打开 Atlas H5
    ↓
前端检测企微环境，发起 OAuth 授权
    ↓
企微回跳 Atlas 前端并携带 code
    ↓
前端调用 /api/auth/wework/callback
    ↓
后端用 code 向企微换取 userid / user_ticket
    ↓
后端查询本地 users 表并补齐角色/门店
    ↓
签发 JWT，返回前端
    ↓
前端进入对应角色首页
```

#### 5.1.2 落地要点

1. **用户唯一标识**：使用 `wework_user_id` 作为外部唯一键。  
2. **本地角色映射**：企微只负责身份，不直接承载系统角色；系统角色以 Atlas 本地表为准。  
3. **首次登录策略**：若企微用户已同步但未分配角色，可进入“待开通”页，不允许直接进入系统。  
4. **Session 策略**：前端持有 access token，后端做接口鉴权；可增加 refresh token。  
5. **环境限制**：优先支持企微内 H5；浏览器外访问只保留测试环境能力。

#### 5.1.3 关键配置

- `WEWORK_CORP_ID`
- `WEWORK_AGENT_ID`
- `WEWORK_SECRET`
- `WEWORK_REDIRECT_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`

### 5.2 请假审批同步方案

#### 5.2.1 推荐方案：回调为主，定时补偿为辅

最稳的做法不是只依赖单一方式，而是双保险：

- **主链路**：企微审批回调推送审批事件；
- **补偿链路**：定时任务拉取未来 60 天内审批通过请假单，补漏与纠偏。

#### 5.2.2 数据同步范围

只同步：

- 审批类型 = 请假；
- 审批状态 = 已通过；
- 时间范围 = 当前日期起未来至少 60 天，同时可回补近 30 天历史。

不同步：

- 草稿；
- 审批中；
- 已拒绝；
- 与排班无关的审批模板。

#### 5.2.3 同步流程

```text
企微审批单状态变更（通过）
    ↓
企微回调 Atlas /api/leaves/wework/callback
    ↓
后端验签、解密、解析审批实例
    ↓
识别审批模板是否为“请假”
    ↓
提取申请人、开始时间、结束时间、时长、状态
    ↓
按 approval_instance_id 做幂等写入 leave_records
    ↓
更新关联排班冲突缓存/状态
    ↓
如存在已排班冲突，标记异常并通知店长
```

#### 5.2.4 同步表设计建议

请至少保留以下字段：

- `wework_approval_instance_id`
- `wework_template_id`
- `wework_user_id`
- `leave_type`
- `start_time`
- `end_time`
- `duration_hours`
- `approval_status`
- `raw_payload`（JSON，可用于排查）
- `synced_at`

#### 5.2.5 幂等与补偿

必须做：

- 对 `approval_instance_id` 建唯一索引；
- 回调重复推送时只更新，不重复插入；
- 定时任务按“最近更新时间”或“未来区间”增量补拉；
- 同步失败要入错误日志表或死信队列，至少能人工重试。

### 5.3 应用消息通知方案

可通过企微应用消息通知以下事件：

- 排班已发布；
- 特殊排班待运营经理审批；
- 特殊排班审批通过/驳回；
- 已排班员工出现请假冲突；
- 员工换班结果。

MVP 建议只做 3 个通知：

1. 排班发布通知员工；
2. 特殊排班待审批通知运营经理；
3. 请假冲突通知店长。

---

## 6. 数据库表设计建议

以下是基于 MVP 的推荐最小闭环表设计。表名可按团队规范调整，但实体不要少。

### 6.1 users 用户表

用途：本地用户主表，承接企微身份映射与角色权限。

关键字段：

- `id`
- `name`
- `mobile`
- `wework_user_id`（唯一）
- `role`（employee / manager / operation_manager / admin）
- `status`
- `joined_at`
- `is_new_staff`（可派生，也可不存）
- `last_login_at`
- `created_at` / `updated_at`

说明：

- 新员工首周判断可通过 `joined_at` + 当前排班日期动态计算，不一定要落 `is_new_staff`。

### 6.2 stores 门店表

用途：门店主数据。

关键字段：

- `id`
- `name`
- `code`
- `brand_type`（normal / mikoshi_icecream）
- `address`
- `manager_user_id`
- `operation_manager_user_id`
- `status`
- `created_at` / `updated_at`

说明：

- `brand_type` 决定默认人数上下限规则。

### 6.3 store_staffs 门店员工关系表

用途：表示用户与门店的任职关系，支持调店、多店兼职、历史归属追踪。

关键字段：

- `id`
- `store_id`
- `user_id`
- `job_title`
- `is_primary`
- `status`
- `joined_at`
- `left_at`
- `created_at` / `updated_at`

说明：

- 门店归属不要直接固化在 `users.store_id`；
- 当前主门店通过 `is_primary=1 and status=active` 判断；
- 该表同时服务排班可选员工、请假归属门店、权限过滤。

### 6.4 store_rules 门店规则表

用途：保存门店默认人数上下限、新员工保护期、是否允许例外审批等规则。

关键字段：

- `id`
- `store_id`
- `default_min_staff`
- `default_max_staff`
- `new_staff_protection_days`
- `allow_understaff_with_approval`
- `allow_overstaff_with_approval`
- `special_rules_json`
- `created_at` / `updated_at`

说明：

- 规则不要硬编码在前端或 service 常量里；
- 班次级人数规则优先读取 `shift_templates`，门店级规则作为默认值与兜底。

### 6.5 shift_templates 班次模板表

用途：定义各门店班次模板。

关键字段：

- `id`
- `store_id`
- `name`
- `start_time`
- `end_time`
- `min_staff`
- `max_staff`
- `status`
- `created_at` / `updated_at`

说明：

- 人数上限下限建议放到班次级，而不是只放门店级，后续更灵活。

### 6.6 schedule_batches 排班批次表

用途：一周排班通常是批量生成，建议单独建批次表方便草稿/审批/发布/回滚。

关键字段：

- `id`
- `store_id`
- `week_start_date`
- `week_end_date`
- `status`（draft / pending_approval / approved / published / cancelled）
- `version`
- `validation_status`
- `requires_approval`
- `created_by`
- `submitted_by`
- `submitted_at`
- `published_by`
- `published_at`
- `created_at` / `updated_at`

说明：

- 同一门店同一周允许多版本并存，使用 `(store_id, week_start_date, version)` 保证唯一；
- 批次是创建、校验、审批、发布的统一聚合根。

### 6.7 schedule_entries 排班明细表

用途：存储具体某员工某天某班次的排班记录。

关键字段：

- `id`
- `batch_id`
- `store_id`
- `user_id`
- `shift_template_id`
- `schedule_date`
- `start_at`
- `end_at`
- `status`（draft / pending_approval / approved / published / cancelled）
- `source`（manual / copied / adjusted / system_generated）
- `exception_flags_json`
- `remark`
- `created_by`
- `updated_by`
- `created_at` / `updated_at`

关键索引：

- `(store_id, schedule_date)`
- `(user_id, schedule_date)`
- `(batch_id)`
- `(shift_template_id, schedule_date)`

说明：

- 直接落 `start_at/end_at`，不要每次依赖模板动态拼时间；
- `exception_flags_json` 用于沉淀规则命中结果，服务审批与审计。

### 6.8 leave_records 请假记录表

用途：企微请假审批同步后的本地事实表。

关键字段：

- `id`
- `user_id`
- `store_id`
- `wework_user_id`
- `wework_approval_instance_id`（唯一）
- `wework_template_id`
- `leave_type`
- `start_time`
- `end_time`
- `duration_hours`
- `approval_status`
- `sync_source`（callback / polling）
- `raw_payload`（JSON）
- `synced_at`
- `created_at` / `updated_at`

关键索引：

- `wework_approval_instance_id unique`
- `(user_id, start_time, end_time)`
- `(store_id, start_time, end_time)`

### 6.9 approval_requests 特殊排班审批表

用途：承接系统内“特殊排班审批”，不是企微请假审批。

关键字段：

- `id`
- `type`（schedule_exception）
- `store_id`
- `schedule_batch_id`
- `submitted_by`
- `current_approver_id`
- `status`（pending / approved / rejected / cancelled）
- `trigger_reasons`（JSON，记录触发了哪些规则）
- `comment`
- `approved_at`
- `created_at` / `updated_at`

说明：

- MVP 只做一级审批即可：店长提交 → 运营经理审批。

### 6.10 approval_actions 审批动作流水表

用途：记录审批过程动作，支撑审计与详情页展示。

关键字段：

- `id`
- `approval_request_id`
- `action`（submit / approve / reject / cancel）
- `actor_user_id`
- `comment`
- `snapshot_json`
- `created_at`

说明：

- 审批主表保存当前态，动作历史单独留痕；
- 这张表对排查“谁在什么时候审批了什么”是刚需。

### 6.11 wework_sync_logs 同步日志表

用途：员工换班申请，P1 再完整启用。

关键字段：

- `id`
- `from_user_id`
- `to_user_id`
- `from_schedule_id`
- `target_schedule_id`
- `status`
- `reason`
- `created_at` / `updated_at`


用途：排查回调与定时同步问题，强烈建议建。

关键字段：

- `id`
- `biz_type`（user_sync / leave_sync / callback）
- `biz_key`
- `request_payload`
- `response_payload`
- `result`（success / failed）
- `error_message`
- `created_at`

### 6.12 wework_approval_sync_cursor 同步游标表

用途：保存企微审批补偿拉取进度，支撑“回调为主、定时补偿为辅”。

关键字段：

- `id`
- `sync_type`
- `cursor_key`
- `last_success_time`
- `last_success_cursor`
- `last_run_status`
- `last_error_message`
- `updated_at`
- `created_at`

### 6.13 swap_requests 换班申请表（P1）

用途：员工换班申请，P1 再完整启用。

关键字段：

- `id`
- `from_user_id`
- `to_user_id`
- `from_schedule_entry_id`
- `target_schedule_entry_id`
- `status`
- `reason`
- `created_at` / `updated_at`

### 6.14 实体关系概览

```text
users 1 ─── n store_staffs n ─── 1 stores
stores 1 ─── 1 store_rules
stores 1 ─── n shift_templates
stores 1 ─── n schedule_batches
schedule_batches 1 ─── n schedule_entries
users 1 ─── n schedule_entries
users 1 ─── n leave_records
stores 1 ─── n leave_records
stores 1 ─── n approval_requests
schedule_batches 1 ─── n approval_requests
approval_requests 1 ─── n approval_actions
```

---

## 7. MVP 范围边界

这一部分必须说清楚，不然项目很容易在“智能排班”“复杂审批”“全量报表”上失控。

### 7.1 MVP 必做（P0）

1. **企微登录**  
   用户可通过企微身份进入系统。

2. **用户/门店/班次基础数据管理**  
   至少支持初始化导入与基础查询。

3. **店长创建周排班**  
   支持草稿保存、编辑、发布。

4. **排班规则校验**  
   包含：
   - 最小人数限制
   - 最大人数限制
   - 请假冲突
   - 同时段重复排班
   - 新员工首周规则

5. **特殊排班审批流**  
   命中例外规则时，转运营经理审批。

6. **企微请假同步**  
   已通过请假可同步到系统并参与排班校验。

7. **员工查看个人班表**  
   支持按周查看自己的排班。

### 7.2 MVP 可做但不阻塞上线（P1）

- 换班申请；
- 企微消息通知完善；
- 通讯录自动全量同步；
- 排班复制上周模板；
- 门店多维筛选；
- 审批列表与操作历史页。

### 7.3 明确不纳入 MVP（P2 以后）

- 真正的“智能排班算法”自动生成最优班表；
- 销售额动态推算人数模型；
- 全量 BI 报表中心；
- 多级复杂审批流引擎；
- 跨品牌复杂工时成本优化；
- 与薪资、考勤、绩效系统深度打通。

### 7.4 MVP 边界判断原则

只要某功能不直接服务于“排班创建—校验—审批—发布—查看”这条主链路，就不要放进首期核心开发。

---

## 8. API 设计建议（便于前后端并行）

### 8.1 认证接口

- `POST /api/auth/wework/callback`
- `GET /api/auth/me`

### 8.2 基础数据接口

- `GET /api/stores`
- `GET /api/stores/:id/shifts`
- `GET /api/users?storeId=&role=`

### 8.3 排班接口

- `POST /api/schedule-batches`
- `GET /api/schedule-batches/:id`
- `POST /api/schedule-batches/:id/validate`
- `POST /api/schedule-batches/:id/submit-approval`
- `POST /api/schedule-batches/:id/publish`
- `GET /api/schedules/calendar?storeId=&start=&end=`
- `GET /api/schedules/me?start=&end=`

### 8.4 请假接口

- `GET /api/leaves?storeId=&start=&end=`
- `POST /api/leaves/sync/manual`（仅管理后台/调试）
- `POST /api/leaves/wework/callback`

### 8.5 审批接口

- `GET /api/approvals/pending`
- `GET /api/approvals/:id`
- `POST /api/approvals/:id/approve`
- `POST /api/approvals/:id/reject`

### 8.6 统一响应结构

```json
{
  "code": 0,
  "message": "ok",
  "data": {},
  "requestId": "trace_xxx",
  "timestamp": 1773220000000
}
```

错误码建议分段：

- `1xxx` 通用错误
- `2xxx` 认证错误
- `3xxx` 排班规则错误
- `4xxx` 审批错误
- `5xxx` 企微集成错误

---

## 9. 技术风险与建议

### 9.1 风险一：企微审批字段解析不稳定

**问题**：不同审批模板字段结构可能不同，若直接按固定字段位置解析，很容易同步失败。  
**建议**：

- 尽早确认企微“请假审批模板”字段结构；
- 在测试环境保存原始 payload；
- 做模板 ID 白名单；
- 解析层和业务层分离，避免模板一变全系统崩。

### 9.2 风险二：请假同步延迟导致排班冲突

**问题**：如果只靠定时任务，审批通过后到同步入库之间可能存在时间差。  
**建议**：

- 采用“回调 + 定时补偿”双机制；
- 发布排班前再做一次实时冲突校验；
- 对命中冲突的排班批次禁止直接发布。

### 9.3 风险三：规则持续变化

**问题**：门店人数规则、特殊审批条件后续一定会变。  
**建议**：

- 把规则抽成可配置项，不要硬编码在页面；
- 至少支持门店级 / 品牌级配置；
- 用 `trigger_reasons` 记录规则命中结果，便于审计。

### 9.4 风险四：角色权限容易失控

**问题**：员工、店长、运营经理视图和接口权限不一致时，会出现越权或误用。  
**建议**：

- 前端做菜单控制，后端做最终鉴权；
- 所有敏感接口必须校验角色 + 门店归属；
- 运营经理是否可跨店查看，后端要明确按数据域控制。

### 9.5 风险五：排班数据模型过早复杂化

**问题**：一开始就做复杂工时规则、轮班算法、多模板编排，会拖死交付。  
**建议**：

- 首期把排班记录建模成“员工 + 日期 + 班次”；
- 先保证 CRUD + 校验 + 审批稳定；
- 智能建议功能后置，基于真实业务数据再演进。

### 9.6 风险六：消息通知轰炸

**问题**：批量发布排班时，如果逐条推消息，很容易打爆企微接口或造成用户骚扰。  
**建议**：

- 一次发布按员工聚合成一条通知；
- 失败可重试，但要做去重；
- 把通知从主事务中异步化，不阻塞排班发布。

### 9.7 风险七：缺少可观测性，出问题难定位

**问题**：企微回调、审批同步、批量排班都是容易出隐性问题的地方。  
**建议**：

- 每次请求带 `requestId`；
- 核心动作写审计日志；
- 企微同步写独立 sync log；
- 至少有一页管理员可查看最近同步失败记录。

---

## 10. Sprint 落地建议

### Sprint 1 建议交付顺序

#### 前端

1. 初始化 Vue3 + Vant + Pinia + Router
2. 完成企微登录落地页 / 回调页
3. 完成角色首页骨架
4. 完成个人班表页、排班管理页静态骨架

#### 后端

1. 初始化 Express + TS + ORM + 基础中间件
2. 建 `users / stores / store_staffs / store_rules / shift_templates / schedule_batches / schedule_entries / leave_records / approval_requests / approval_actions / wework_sync_logs` 表
3. 打通 `auth/wework/callback`
4. 完成 `GET /auth/me`、`GET /stores`、`GET /stores/:id/shifts`
5. 预留企微回调入口与同步日志表

#### 联调优先级

1. 企微登录联调
2. 用户角色返回联调
3. 门店/班次接口联调
4. 排班草稿创建联调

---

## 11. 最终结论

Atlas 首期不需要花哨架构，核心是把三件事做稳：

1. **企微登录稳定**；
2. **请假同步可信**；
3. **排班校验 + 特殊审批闭环完整**。

技术上建议保持：

- 前端 H5 轻量化；
- 后端模块化但不过度微服务；
- MySQL 为主、Redis 为辅；
- 企微回调 + 补偿同步双保险；
- 规则优先、智能后置。

如果团队按这份文档推进，Sprint 1 的“项目初始化 + 基础架构 + 企微登录”是能落地的，而且不会给后面请假同步和审批流埋坑。
