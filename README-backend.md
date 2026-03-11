# Atlas Backend

后端目录：`atlas-server/`

## 当前状态

这版已经不是占位脚手架，而是一个**可直接启动的 mock / 内存版 MVP 后端**：

- 路由统一为复数资源风格：`/api/schedules`、`/api/leaves`、`/api/approvals`
- 已落地基础模块：`stores`、`employees`、`store_staffs`、`schedules`、`approvals`
- 已提供 mock 登录接口与用户上下文中间件
- 已提供内存数据版基础 CRUD
- `stores` / `schedules` / `approvals` / `employees` / `leaves` 均可返回示例数据

## 技术栈

- Node.js
- Express
- In-memory mock data（当前无数据库依赖）

## 目录结构

```bash
atlas-server/
├── package.json
└── src/
    ├── app.js
    ├── data/
    │   └── mock-db.js
    ├── middlewares/
    │   └── auth.js
    ├── modules/
    │   ├── auth/
    │   ├── approvals/
    │   ├── employees/
    │   ├── leaves/
    │   ├── schedules/
    │   ├── stores/
    │   └── store_staffs/
    ├── routes/
    │   └── health.js
    ├── stores/
    │   └── index.js
    └── utils/
        ├── helpers.js
        └── response.js
```

## 启动方式

在 `projects/atlas/atlas-server` 目录下执行：

```bash
npm install
npm run dev
```

生产启动：

```bash
npm install
npm start
```

默认端口：`3000`

## Mock 鉴权说明

当前先不接企业微信真实 OAuth，使用 mock 登录：

### 1. Mock 登录

```bash
curl -X POST http://localhost:3000/api/auth/mock/login \
  -H 'Content-Type: application/json' \
  -d '{"userId":101}'
```

返回：

- `accessToken`: 当前直接返回用户 ID 字符串，例如 `101`
- 后续请求可直接带：

```http
Authorization: Bearer 101
```

或者：

```http
x-mock-user-id: 101
```

### 2. Mock 企微登录回调

```bash
curl -X POST http://localhost:3000/api/auth/wework/callback \
  -H 'Content-Type: application/json' \
  -d '{"code":"mock-code"}'
```

会返回默认 mock 用户登录态。

### 3. 当前可用 mock 用户

- `101` 张三（manager，徐汇美罗城店）
- `102` 李四（employee，徐汇美罗城店）
- `201` 王经理（operation_manager）
- `203` 赵六（manager，静安来福士店）

## 当前可跑接口

### 基础

- `GET /`
- `GET /health`

### Auth

- `POST /api/auth/mock/login`
- `POST /api/auth/wework/callback`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Stores

- `GET /api/stores`
- `POST /api/stores`
- `GET /api/stores/:id`
- `PATCH /api/stores/:id`
- `DELETE /api/stores/:id`
- `GET /api/stores/:id/shifts`

### Employees

- `GET /api/employees`
- `POST /api/employees`
- `GET /api/employees/:id`

### Store Staffs

- `GET /api/store_staffs`
- `POST /api/store_staffs`

### Schedules

- `GET /api/schedules`
- `POST /api/schedules/batches`
- `PATCH /api/schedules/batches/:id`
- `GET /api/schedules/batches/:id`
- `POST /api/schedules/batches/:id/validate`
- `POST /api/schedules/batches/:id/submit-approval`
- `POST /api/schedules/batches/:id/publish`
- `GET /api/schedules/calendar`
- `GET /api/schedules/me`
- `POST /api/schedules/batches/:id/duplicate`

### Leaves

- `GET /api/leaves`
- `POST /api/leaves/sync/manual`
- `POST /api/leaves/wework/callback`

### Approvals

- `POST /api/approvals`
- `GET /api/approvals`
- `GET /api/approvals/pending`
- `GET /api/approvals/:id`
- `POST /api/approvals/:id/approve`
- `POST /api/approvals/:id/reject`

## 返回格式

统一返回格式：

```json
{
  "code": 0,
  "message": "ok",
  "data": {},
  "requestId": "trace_xxx",
  "timestamp": 1773240000000
}
```

## 实现说明

### 1. 数据层

当前所有数据存放在：

- `src/data/mock-db.js`

服务重启后数据会重置。

### 2. 用户上下文

`src/middlewares/auth.js` 会从以下位置解析当前用户：

1. `Authorization: Bearer <token>`
2. `x-mock-user-id`

解析成功后挂到：

- `req.user`

### 3. 排班校验（mock 规则）

`POST /api/schedules/batches/:id/validate` 当前已支持基础 mock 校验：

- 最小人数不足
- 最大人数超限
- 请假冲突
- 新员工首周提示

命中规则后会返回 `issues`，并设置批次 `requiresApproval`。

## 下一步建议

当前这版适合：

- 前端联调
- API 结构冻结前验证
- 业务流程 walkthrough

后续真实化时，建议按下面顺序替换：

1. 接 MySQL / Prisma / Sequelize 等真实持久层
2. 接企业微信 OAuth
3. 把 mock 数据仓切成 repository / service 层
4. 增加参数校验、RBAC、单测、错误码细化
