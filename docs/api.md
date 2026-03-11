# Atlas API 文档

> 项目：Atlas 企微门店智能排班系统  
> 角色：Backend Dev（Peter）  
> 版本：v1.0  
> 更新日期：2026-03-11

---

## 1. 文档目标

本文档基于当前 PRD、`architecture.md` 与 `atlas-server` 现有 Express 脚手架输出，定义 MVP 阶段前后端联调用 API。

目标：

- 明确首期后端接口范围；
- 统一路由、方法、请求参数、响应结构；
- 覆盖 `auth / stores / employees / schedules / leaves / approvals` 六大域；
- 标记 **Sprint 1 必需** 与 **MVP 必需**；
- 保持与当前 `atlas-server` 的 Express 风格一致，按模块挂载路由。

---

## 2. 设计约定

### 2.1 Base URL

开发环境建议：

```text
http://localhost:3000
```

API 前缀：

```text
/api
```

### 2.2 路由风格

参考当前 `atlas-server/src/app.js`：

```js
app.use('/api/auth', authRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/leave', leaveRouter);
app.use('/api/approval', approvalRouter);
```

为保持 Express 结构统一，本文档建议继续按**模块路由**组织：

- `/api/auth`
- `/api/stores`
- `/api/employees`
- `/api/schedules`
- `/api/leaves`
- `/api/approvals`

> 说明：当前脚手架里是单数 `/api/schedule`、`/api/leave`、`/api/approval`。正式开发建议统一调整为复数资源名，便于 REST 风格与后续扩展；若 Sprint 1 为了最小改动保留单数模块名，也建议在模块内部提供与本文档一致的资源语义。

### 2.3 认证方式

- 登录来源：企业微信 OAuth
- 会话方式：JWT Bearer Token
- 请求头：

```http
Authorization: Bearer <access_token>
```

### 2.4 统一响应结构

成功响应：

```json
{
  "code": 0,
  "message": "ok",
  "data": {},
  "requestId": "trace_01HXXX",
  "timestamp": 1773240000000
}
```

失败响应：

```json
{
  "code": 3001,
  "message": "schedule validation failed",
  "data": {
    "details": []
  },
  "requestId": "trace_01HXXX",
  "timestamp": 1773240000000
}
```

### 2.5 错误码约定

| 错误段 | 含义 |
|---|---|
| 1xxx | 通用参数/系统错误 |
| 2xxx | 认证/授权错误 |
| 3xxx | 排班/请假规则错误 |
| 4xxx | 审批流错误 |
| 5xxx | 企微集成错误 |

建议首批错误码：

| code | 含义 |
|---|---|
| 1001 | 参数校验失败 |
| 1002 | 资源不存在 |
| 1003 | 状态不允许当前操作 |
| 2001 | 未登录或 token 无效 |
| 2002 | 无权限访问 |
| 3001 | 排班校验失败 |
| 3002 | 存在请假冲突 |
| 3003 | 存在重复排班 |
| 3004 | 人数低于最小值 |
| 3005 | 人数高于最大值 |
| 4001 | 审批单不存在 |
| 4002 | 审批状态已结束 |
| 5001 | 企微 code 换取用户失败 |
| 5002 | 企微请假同步失败 |
| 5003 | 企微回调验签失败 |

---

## 3. 状态枚举

### 3.1 用户角色

| 值 | 说明 |
|---|---|
| `employee` | 员工 |
| `manager` | 店长 |
| `operation_manager` | 运营经理 |
| `admin` | 系统管理员（内部） |

### 3.2 门店品牌类型

| 值 | 说明 |
|---|---|
| `normal` | 普通品牌 |
| `mikoshi_icecream` | 蜜可诗冰淇淋 |

### 3.3 排班批次状态

| 值 | 说明 |
|---|---|
| `draft` | 草稿 |
| `pending_approval` | 待审批 |
| `approved` | 审批通过待发布 |
| `published` | 已发布 |
| `cancelled` | 已取消 |

### 3.4 排班明细状态

| 值 | 说明 |
|---|---|
| `draft` | 草稿 |
| `pending_approval` | 待审批 |
| `published` | 已发布 |
| `cancelled` | 已取消 |

### 3.5 请假状态

| 值 | 说明 |
|---|---|
| `approved` | 已审批通过 |
| `cancelled` | 已撤销/失效 |

### 3.6 审批状态

| 值 | 说明 |
|---|---|
| `pending` | 待审批 |
| `approved` | 已通过 |
| `rejected` | 已驳回 |
| `cancelled` | 已取消 |

### 3.7 审批触发原因

| 值 | 说明 |
|---|---|
| `UNDER_MIN_STAFF` | 低于最小在店人数 |
| `OVER_MAX_STAFF` | 高于满编人数 |
| `LEAVE_CONFLICT` | 与请假冲突 |
| `NON_VOLUNTARY_SHIFT_CHANGE` | 临时调班（非自愿） |
| `OVERTIME_OR_REDUCED_SHIFT` | 加班/减少班次 |
| `NEW_EMPLOYEE_FIRST_WEEK` | 新员工首周排班 |
| `PROMOTION_SPECIAL_ARRANGEMENT` | 促销/旺季特殊安排 |

---

## 4. 接口清单总览

### 4.1 Sprint 1 必需接口

| 模块 | 接口 | 说明 |
|---|---|---|
| auth | `POST /api/auth/wework/callback` | 企微 code 登录 |
| auth | `GET /api/auth/me` | 获取当前用户 |
| stores | `GET /api/stores` | 获取门店列表 |
| stores | `GET /api/stores/:id/shifts` | 获取门店班次模板 |
| employees | `GET /api/employees` | 获取员工列表（按门店） |
| schedules | `POST /api/schedules/batches` | 创建周排班草稿 |
| schedules | `GET /api/schedules/batches/:id` | 查询排班批次详情 |
| schedules | `POST /api/schedules/batches/:id/validate` | 校验排班规则 |
| leaves | `GET /api/leaves` | 查询请假记录 |
| approvals | `POST /api/approvals` | 创建特殊排班审批 |
| approvals | `GET /api/approvals/:id` | 查询审批详情 |

### 4.2 MVP 必需接口

在 Sprint 1 基础上，MVP 还需补齐：

| 模块 | 接口 | 说明 |
|---|---|---|
| auth | `POST /api/auth/logout` | 退出登录 |
| schedules | `PATCH /api/schedules/batches/:id` | 编辑草稿 |
| schedules | `POST /api/schedules/batches/:id/submit-approval` | 提交特殊审批 |
| schedules | `POST /api/schedules/batches/:id/publish` | 发布排班 |
| schedules | `GET /api/schedules/calendar` | 门店排班查询 |
| schedules | `GET /api/schedules/me` | 员工查询个人班表 |
| approvals | `GET /api/approvals/pending` | 待审批列表 |
| approvals | `POST /api/approvals/:id/approve` | 运营经理审批通过 |
| approvals | `POST /api/approvals/:id/reject` | 运营经理驳回 |
| leaves | `POST /api/leaves/sync/manual` | 手动补偿同步请假 |
| leaves | `POST /api/leaves/wework/callback` | 企微审批回调 |

### 4.3 P1 非 MVP 阻塞接口

| 模块 | 接口 | 说明 |
|---|---|---|
| employees | `GET /api/employees/:id` | 员工详情 |
| schedules | `POST /api/schedules/batches/:id/duplicate` | 复制上周排班 |
| approvals | `GET /api/approvals` | 审批历史分页 |

---

## 5. Auth 模块

路由前缀：`/api/auth`

### 5.1 POST /api/auth/wework/callback

**用途**：前端拿到企微 `code` 后，调用后端换取本地登录态。  
**优先级**：Sprint 1 / MVP 必需

#### 请求体

```json
{
  "code": "CODE_FROM_WEWORK"
}
```

#### 请求参数说明

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `code` | string | 是 | 企业微信 OAuth 回调 code |

#### 响应示例

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "accessToken": "jwt_token",
    "expiresIn": 7200,
    "user": {
      "id": 101,
      "name": "张三",
      "role": "manager",
      "storeId": 1,
      "weworkUserId": "zhangsan",
      "status": "active"
    }
  },
  "requestId": "trace_auth_001",
  "timestamp": 1773240000000
}
```

#### 处理逻辑

1. 使用 `code` 向企微换取 `userid`；
2. 查找本地用户；
3. 返回用户角色、门店归属；
4. 签发 JWT。

---

### 5.2 GET /api/auth/me

**用途**：获取当前登录用户信息。  
**优先级**：Sprint 1 / MVP 必需

#### 响应示例

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 101,
    "name": "张三",
    "role": "manager",
    "mobile": "13800000000",
    "store": {
      "id": 1,
      "name": "徐汇美罗城店"
    },
    "permissions": [
      "schedule:create",
      "schedule:publish",
      "employee:read"
    ]
  },
  "requestId": "trace_auth_002",
  "timestamp": 1773240000000
}
```

---

### 5.3 POST /api/auth/logout

**用途**：退出登录。  
**优先级**：MVP 必需

#### 请求体

空对象即可：

```json
{}
```

#### 响应示例

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "success": true
  },
  "requestId": "trace_auth_003",
  "timestamp": 1773240000000
}
```

---

## 6. Stores 模块

路由前缀：`/api/stores`

### 6.1 GET /api/stores

**用途**：获取当前用户可见门店列表。  
**优先级**：Sprint 1 / MVP 必需

#### Query 参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `status` | string | 否 | `active` / `inactive` |
| `keyword` | string | 否 | 门店名称关键字 |

#### 响应示例

```json
{
  "code": 0,
  "message": "ok",
  "data": [
    {
      "id": 1,
      "name": "徐汇美罗城店",
      "code": "XHMLC",
      "brandType": "normal",
      "address": "上海市徐汇区肇嘉浜路...",
      "managerUserId": 101,
      "operationManagerUserId": 201,
      "staffRule": {
        "defaultMinStaff": 3,
        "defaultMaxStaff": 5
      }
    }
  ],
  "requestId": "trace_store_001",
  "timestamp": 1773240000000
}
```

---

### 6.2 GET /api/stores/:id

**用途**：获取单个门店信息。  
**优先级**：MVP 可选，建议保留

#### Path 参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | number | 是 | 门店 ID |

#### 响应结构

返回单个 store 对象，字段同 `GET /api/stores`。

---

### 6.3 GET /api/stores/:id/shifts

**用途**：获取门店班次模板列表。  
**优先级**：Sprint 1 / MVP 必需

#### 响应示例

```json
{
  "code": 0,
  "message": "ok",
  "data": [
    {
      "id": 11,
      "storeId": 1,
      "name": "早班",
      "startTime": "09:00",
      "endTime": "17:00",
      "minStaff": 3,
      "maxStaff": 5,
      "status": "active"
    },
    {
      "id": 12,
      "storeId": 1,
      "name": "晚班",
      "startTime": "17:00",
      "endTime": "23:00",
      "minStaff": 3,
      "maxStaff": 5,
      "status": "active"
    }
  ],
  "requestId": "trace_store_002",
  "timestamp": 1773240000000
}
```

---

## 7. Employees 模块

路由前缀：`/api/employees`

> 说明：架构文档中后端目录名是 `user`，但对前端暴露 API 时建议统一按业务对象使用 `employees`，更符合业务语义。

### 7.1 GET /api/employees

**用途**：查询员工列表，用于排班选择和员工管理页。  
**优先级**：Sprint 1 / MVP 必需

#### Query 参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `storeId` | number | 否 | 门店 ID，不传时按权限返回 |
| `role` | string | 否 | `employee` / `manager` / `operation_manager` |
| `status` | string | 否 | `active` / `inactive` |
| `keyword` | string | 否 | 姓名/手机号关键字 |
| `page` | number | 否 | 页码，默认 1 |
| `pageSize` | number | 否 | 每页数量，默认 20 |

#### 响应示例

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [
      {
        "id": 101,
        "name": "张三",
        "mobile": "13800000000",
        "role": "employee",
        "storeId": 1,
        "storeName": "徐汇美罗城店",
        "joinedAt": "2026-03-01",
        "isNewEmployee": true,
        "status": "active"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 1
    }
  },
  "requestId": "trace_employee_001",
  "timestamp": 1773240000000
}
```

---

### 7.2 GET /api/employees/:id

**用途**：获取员工详情。  
**优先级**：P1

#### 响应示例

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 101,
    "name": "张三",
    "mobile": "13800000000",
    "role": "employee",
    "store": {
      "id": 1,
      "name": "徐汇美罗城店"
    },
    "joinedAt": "2026-03-01",
    "status": "active"
  },
  "requestId": "trace_employee_002",
  "timestamp": 1773240000000
}
```

---

## 8. Schedules 模块

路由前缀：`/api/schedules`

这是 MVP 的核心模块，负责周排班草稿、校验、审批、发布、查询。

### 8.1 POST /api/schedules/batches

**用途**：创建周排班草稿。  
**优先级**：Sprint 1 / MVP 必需

#### 请求体

```json
{
  "storeId": 1,
  "weekStartDate": "2026-03-16",
  "weekEndDate": "2026-03-22",
  "entries": [
    {
      "scheduleDate": "2026-03-16",
      "shiftId": 11,
      "employeeIds": [101, 102, 103],
      "remark": "常规排班"
    },
    {
      "scheduleDate": "2026-03-16",
      "shiftId": 12,
      "employeeIds": [104, 105, 106],
      "remark": "晚高峰"
    }
  ]
}
```

#### 参数说明

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `storeId` | number | 是 | 门店 ID |
| `weekStartDate` | string | 是 | 周开始日期，`YYYY-MM-DD` |
| `weekEndDate` | string | 是 | 周结束日期，`YYYY-MM-DD` |
| `entries` | array | 是 | 排班条目 |
| `entries[].scheduleDate` | string | 是 | 排班日期 |
| `entries[].shiftId` | number | 是 | 班次模板 ID |
| `entries[].employeeIds` | number[] | 是 | 员工 ID 列表 |
| `entries[].remark` | string | 否 | 备注 |

#### 响应示例

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "batchId": 10001,
    "status": "draft"
  },
  "requestId": "trace_schedule_001",
  "timestamp": 1773240000000
}
```

---

### 8.2 PATCH /api/schedules/batches/:id

**用途**：编辑排班草稿。  
**优先级**：MVP 必需

#### 请求体

与创建接口保持一致，可按全量覆盖方式提交：

```json
{
  "entries": [
    {
      "scheduleDate": "2026-03-16",
      "shiftId": 11,
      "employeeIds": [101, 102, 103, 107],
      "remark": "补充一名兼职"
    }
  ]
}
```

#### 响应

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "batchId": 10001,
    "status": "draft",
    "updated": true
  },
  "requestId": "trace_schedule_002",
  "timestamp": 1773240000000
}
```

---

### 8.3 GET /api/schedules/batches/:id

**用途**：获取排班批次详情。  
**优先级**：Sprint 1 / MVP 必需

#### 响应示例

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 10001,
    "storeId": 1,
    "weekStartDate": "2026-03-16",
    "weekEndDate": "2026-03-22",
    "status": "draft",
    "createdBy": 101,
    "entries": [
      {
        "id": 50001,
        "scheduleDate": "2026-03-16",
        "shiftId": 11,
        "shiftName": "早班",
        "startTime": "09:00",
        "endTime": "17:00",
        "employees": [
          {
            "id": 101,
            "name": "张三"
          },
          {
            "id": 102,
            "name": "李四"
          }
        ],
        "remark": "常规排班",
        "status": "draft"
      }
    ]
  },
  "requestId": "trace_schedule_003",
  "timestamp": 1773240000000
}
```

---

### 8.4 POST /api/schedules/batches/:id/validate

**用途**：执行排班规则校验。  
**优先级**：Sprint 1 / MVP 必需

#### 请求体

```json
{
  "strict": true
}
```

#### 响应示例（通过）

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "passed": true,
    "requiresApproval": false,
    "issues": []
  },
  "requestId": "trace_schedule_004",
  "timestamp": 1773240000000
}
```

#### 响应示例（命中例外）

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "passed": false,
    "requiresApproval": true,
    "issues": [
      {
        "type": "UNDER_MIN_STAFF",
        "level": "warning",
        "scheduleDate": "2026-03-16",
        "shiftId": 11,
        "message": "早班排班人数低于最小值 3"
      },
      {
        "type": "NEW_EMPLOYEE_FIRST_WEEK",
        "level": "warning",
        "scheduleDate": "2026-03-16",
        "employeeId": 101,
        "message": "员工张三处于入职首周"
      }
    ]
  },
  "requestId": "trace_schedule_005",
  "timestamp": 1773240000000
}
```

#### 校验范围

- 最小人数校验；
- 最大人数校验；
- 请假冲突；
- 同时间重复排班；
- 新员工首周规则；
- 是否命中特殊审批条件。

---

### 8.5 POST /api/schedules/batches/:id/submit-approval

**用途**：将命中特殊规则的排班批次提交给运营经理审批。  
**优先级**：MVP 必需

#### 请求体

```json
{
  "triggerReasons": [
    "UNDER_MIN_STAFF",
    "NEW_EMPLOYEE_FIRST_WEEK"
  ],
  "comment": "周一早班临时缺人，申请例外发布"
}
```

#### 响应示例

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "batchId": 10001,
    "approvalId": 90001,
    "status": "pending_approval"
  },
  "requestId": "trace_schedule_006",
  "timestamp": 1773240000000
}
```

---

### 8.6 POST /api/schedules/batches/:id/publish

**用途**：发布排班。若无例外直接发布；若需审批则仅允许审批通过后发布。  
**优先级**：MVP 必需

#### 请求体

```json
{
  "notifyEmployees": true
}
```

#### 响应示例

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "batchId": 10001,
    "status": "published",
    "publishedAt": "2026-03-11T14:00:00.000Z"
  },
  "requestId": "trace_schedule_007",
  "timestamp": 1773240000000
}
```

---

### 8.7 GET /api/schedules/calendar

**用途**：按门店、日期区间查询排班视图。  
**优先级**：MVP 必需

#### Query 参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `storeId` | number | 是 | 门店 ID |
| `startDate` | string | 是 | 开始日期 |
| `endDate` | string | 是 | 结束日期 |
| `status` | string | 否 | `draft` / `published` 等 |

#### 响应示例

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "storeId": 1,
    "range": {
      "startDate": "2026-03-16",
      "endDate": "2026-03-22"
    },
    "days": [
      {
        "date": "2026-03-16",
        "shifts": [
          {
            "shiftId": 11,
            "shiftName": "早班",
            "employees": [
              {
                "id": 101,
                "name": "张三"
              }
            ]
          }
        ]
      }
    ]
  },
  "requestId": "trace_schedule_008",
  "timestamp": 1773240000000
}
```

---

### 8.8 GET /api/schedules/me

**用途**：员工查看个人班表。  
**优先级**：MVP 必需（PRD P1，但在架构里已纳入 MVP 必做）

#### Query 参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `startDate` | string | 是 | 开始日期 |
| `endDate` | string | 是 | 结束日期 |

#### 响应示例

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "userId": 101,
    "list": [
      {
        "scheduleId": 50001,
        "date": "2026-03-16",
        "storeId": 1,
        "storeName": "徐汇美罗城店",
        "shiftId": 11,
        "shiftName": "早班",
        "startTime": "09:00",
        "endTime": "17:00",
        "status": "published"
      }
    ]
  },
  "requestId": "trace_schedule_009",
  "timestamp": 1773240000000
}
```

---

### 8.9 POST /api/schedules/batches/:id/duplicate

**用途**：复制上周排班作为草稿。  
**优先级**：P1

---

## 9. Leaves 模块

路由前缀：`/api/leaves`

> 设计原则：Atlas 不自建请假审批流，员工请假仍走企微；Atlas 只同步、展示、参与排班校验。

### 9.1 GET /api/leaves

**用途**：查询已同步请假记录。  
**优先级**：Sprint 1 / MVP 必需

#### Query 参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `storeId` | number | 否 | 门店 ID |
| `employeeId` | number | 否 | 员工 ID |
| `startDate` | string | 是 | 查询开始时间 |
| `endDate` | string | 是 | 查询结束时间 |
| `status` | string | 否 | 默认 `approved` |

#### 响应示例

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [
      {
        "id": 70001,
        "employeeId": 101,
        "employeeName": "张三",
        "storeId": 1,
        "storeName": "徐汇美罗城店",
        "leaveType": "annual_leave",
        "startTime": "2026-03-18T09:00:00.000Z",
        "endTime": "2026-03-18T18:00:00.000Z",
        "durationHours": 8,
        "approvalStatus": "approved",
        "weworkApprovalInstanceId": "202603110001",
        "syncSource": "callback",
        "syncedAt": "2026-03-11T12:00:00.000Z"
      }
    ]
  },
  "requestId": "trace_leave_001",
  "timestamp": 1773240000000
}
```

---

### 9.2 POST /api/leaves/sync/manual

**用途**：手动触发请假补偿同步，仅管理角色可用。  
**优先级**：MVP 必需

#### 请求体

```json
{
  "startDate": "2026-03-11",
  "endDate": "2026-05-11"
}
```

#### 响应示例

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "taskId": "leave_sync_001",
    "range": {
      "startDate": "2026-03-11",
      "endDate": "2026-05-11"
    },
    "status": "accepted"
  },
  "requestId": "trace_leave_002",
  "timestamp": 1773240000000
}
```

---

### 9.3 POST /api/leaves/wework/callback

**用途**：接收企微审批回调，同步请假审批结果。  
**优先级**：MVP 必需

#### 请求体

由企微推送，后端需保留原始 payload；此处不约束前端调用。

#### 响应示例

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "success": true
  },
  "requestId": "trace_leave_003",
  "timestamp": 1773240000000
}
```

#### 后端处理要求

- 验签、解密、解析审批实例；
- 仅同步“请假模板 + 已通过”；
- 以 `weworkApprovalInstanceId` 做幂等；
- 如与已发布班表冲突，写入冲突标记并通知店长。

---

## 10. Approvals 模块

路由前缀：`/api/approvals`

该模块处理的是**系统内特殊排班审批**，不是企微请假审批。

### 10.1 POST /api/approvals

**用途**：创建审批单。通常由 `submit-approval` 内部调用，但保留独立接口便于后台扩展。  
**优先级**：Sprint 1 / MVP 必需

#### 请求体

```json
{
  "type": "schedule_exception",
  "storeId": 1,
  "scheduleBatchId": 10001,
  "triggerReasons": [
    "UNDER_MIN_STAFF",
    "NEW_EMPLOYEE_FIRST_WEEK"
  ],
  "comment": "周一早班临时缺人，申请审批"
}
```

#### 响应示例

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 90001,
    "status": "pending",
    "currentApproverId": 201
  },
  "requestId": "trace_approval_001",
  "timestamp": 1773240000000
}
```

---

### 10.2 GET /api/approvals/pending

**用途**：运营经理查询待审批列表。  
**优先级**：MVP 必需

#### Query 参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `storeId` | number | 否 | 按门店过滤 |
| `page` | number | 否 | 默认 1 |
| `pageSize` | number | 否 | 默认 20 |

#### 响应示例

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [
      {
        "id": 90001,
        "type": "schedule_exception",
        "storeId": 1,
        "storeName": "徐汇美罗城店",
        "scheduleBatchId": 10001,
        "submittedBy": {
          "id": 101,
          "name": "张三"
        },
        "triggerReasons": [
          "UNDER_MIN_STAFF"
        ],
        "status": "pending",
        "createdAt": "2026-03-11T13:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 1
    }
  },
  "requestId": "trace_approval_002",
  "timestamp": 1773240000000
}
```

---

### 10.3 GET /api/approvals/:id

**用途**：查看审批详情。  
**优先级**：Sprint 1 / MVP 必需

#### 响应示例

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 90001,
    "type": "schedule_exception",
    "storeId": 1,
    "scheduleBatchId": 10001,
    "status": "pending",
    "triggerReasons": [
      "UNDER_MIN_STAFF",
      "NEW_EMPLOYEE_FIRST_WEEK"
    ],
    "comment": "周一早班临时缺人，申请审批",
    "submittedBy": {
      "id": 101,
      "name": "张三"
    },
    "currentApprover": {
      "id": 201,
      "name": "王经理"
    },
    "createdAt": "2026-03-11T13:00:00.000Z"
  },
  "requestId": "trace_approval_003",
  "timestamp": 1773240000000
}
```

---

### 10.4 POST /api/approvals/:id/approve

**用途**：运营经理审批通过。  
**优先级**：MVP 必需

#### 请求体

```json
{
  "comment": "同意本次特殊排班"
}
```

#### 响应示例

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 90001,
    "status": "approved",
    "approvedAt": "2026-03-11T14:30:00.000Z"
  },
  "requestId": "trace_approval_004",
  "timestamp": 1773240000000
}
```

---

### 10.5 POST /api/approvals/:id/reject

**用途**：运营经理驳回审批。  
**优先级**：MVP 必需

#### 请求体

```json
{
  "comment": "门店人数过低，不允许发布"
}
```

#### 响应示例

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 90001,
    "status": "rejected"
  },
  "requestId": "trace_approval_005",
  "timestamp": 1773240000000
}
```

---

### 10.6 GET /api/approvals

**用途**：审批历史列表。  
**优先级**：P1

---

## 11. 与当前 atlas-server 脚手架的映射建议

当前脚手架已存在：

- `src/modules/auth/index.js`
- `src/modules/schedule/index.js`
- `src/modules/leave/index.js`
- `src/modules/approval/index.js`

建议按以下方式逐步扩展：

### 11.1 app.js 路由挂载建议

```js
app.use('/api/auth', authRouter);
app.use('/api/stores', storeRouter);
app.use('/api/employees', employeeRouter);
app.use('/api/schedules', scheduleRouter);
app.use('/api/leaves', leaveRouter);
app.use('/api/approvals', approvalRouter);
```

### 11.2 模块内部 Express Router 建议

#### auth

```text
POST   /wework/callback
GET    /me
POST   /logout
```

#### stores

```text
GET    /
GET    /:id
GET    /:id/shifts
```

#### employees

```text
GET    /
GET    /:id
```

#### schedules

```text
POST   /batches
PATCH  /batches/:id
GET    /batches/:id
POST   /batches/:id/validate
POST   /batches/:id/submit-approval
POST   /batches/:id/publish
GET    /calendar
GET    /me
POST   /batches/:id/duplicate
```

#### leaves

```text
GET    /
POST   /sync/manual
POST   /wework/callback
```

#### approvals

```text
POST   /
GET    /
GET    /pending
GET    /:id
POST   /:id/approve
POST   /:id/reject
```

---

## 12. 数据对象建议

### 12.1 Store

```json
{
  "id": 1,
  "name": "徐汇美罗城店",
  "code": "XHMLC",
  "brandType": "normal",
  "address": "上海市徐汇区...",
  "managerUserId": 101,
  "operationManagerUserId": 201,
  "status": "active"
}
```

### 12.2 Employee

```json
{
  "id": 101,
  "name": "张三",
  "mobile": "13800000000",
  "role": "employee",
  "storeId": 1,
  "joinedAt": "2026-03-01",
  "isNewEmployee": true,
  "status": "active"
}
```

### 12.3 Shift

```json
{
  "id": 11,
  "storeId": 1,
  "name": "早班",
  "startTime": "09:00",
  "endTime": "17:00",
  "minStaff": 3,
  "maxStaff": 5,
  "status": "active"
}
```

### 12.4 ScheduleBatch

```json
{
  "id": 10001,
  "storeId": 1,
  "weekStartDate": "2026-03-16",
  "weekEndDate": "2026-03-22",
  "status": "draft",
  "createdBy": 101,
  "publishedAt": null
}
```

### 12.5 LeaveRecord

```json
{
  "id": 70001,
  "employeeId": 101,
  "storeId": 1,
  "leaveType": "annual_leave",
  "startTime": "2026-03-18T09:00:00.000Z",
  "endTime": "2026-03-18T18:00:00.000Z",
  "durationHours": 8,
  "approvalStatus": "approved",
  "weworkApprovalInstanceId": "202603110001",
  "syncSource": "callback"
}
```

### 12.6 Approval

```json
{
  "id": 90001,
  "type": "schedule_exception",
  "storeId": 1,
  "scheduleBatchId": 10001,
  "status": "pending",
  "triggerReasons": [
    "UNDER_MIN_STAFF"
  ],
  "comment": "周一早班临时缺人，申请审批",
  "currentApproverId": 201
}
```

---

## 13. 权限约束建议

### 13.1 员工

可访问：

- `GET /api/auth/me`
- `GET /api/schedules/me`
- `GET /api/leaves`（仅本人）

### 13.2 店长

可访问：

- 本门店 `stores / employees / schedules / leaves`
- 创建、编辑、校验、提交审批、发布本门店排班

不可访问：

- 审批其他门店数据
- 审批动作本身

### 13.3 运营经理

可访问：

- 所负责门店排班与请假查询
- `GET /api/approvals/pending`
- `POST /api/approvals/:id/approve`
- `POST /api/approvals/:id/reject`

---

## 14. MVP 落地结论

如果只按首期最小闭环推进，后端接口建议优先实现顺序如下：

### 第一优先级（Sprint 1）

1. `POST /api/auth/wework/callback`
2. `GET /api/auth/me`
3. `GET /api/stores`
4. `GET /api/stores/:id/shifts`
5. `GET /api/employees`
6. `POST /api/schedules/batches`
7. `GET /api/schedules/batches/:id`
8. `POST /api/schedules/batches/:id/validate`
9. `GET /api/leaves`
10. `POST /api/approvals`
11. `GET /api/approvals/:id`

### 第二优先级（MVP 上线前补齐）

1. `PATCH /api/schedules/batches/:id`
2. `POST /api/schedules/batches/:id/submit-approval`
3. `POST /api/schedules/batches/:id/publish`
4. `GET /api/schedules/calendar`
5. `GET /api/schedules/me`
6. `GET /api/approvals/pending`
7. `POST /api/approvals/:id/approve`
8. `POST /api/approvals/:id/reject`
9. `POST /api/leaves/sync/manual`
10. `POST /api/leaves/wework/callback`

---

## 15. 最后说明

这份 API 文档遵循三个原则：

1. **只覆盖 MVP 主链路**：登录、排班、请假同步、特殊审批、个人查看；
2. **尽量贴合现有 Express 脚手架**：按模块挂载 router，接口命名清晰；
3. **为后续扩展留口子，但不提前做复杂设计**：例如换班、通知、智能排班建议都可后置。

建议后续与 `database.md` 一起补齐字段约束和表关系，再进入 controller / service / repository 层落地。