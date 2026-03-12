# WeCom Integration Plan

> Sprint 2 规划文档
> 目标：完成 WeCom OAuth 登录接入与用户映射

---

## 1. WeCom OAuth 登录接入

### 1.1 OAuth 2.0 流程说明

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Atlas 前端    │     │   Atlas 后端    │     │   WeCom 服务    │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  1. 跳转 WeCom 授权页  │                       │
         │──────────────────────>│                       │
         │                       │                       │
         │              2. 用户授权                       │
         │<───────────────────────────────────────────────│
         │                       │                       │
         │  3. 携带 code 回调    │                       │
         │──────────────────────>│                       │
         │                       │                       │
         │                       │  4. code → userId      │
         │                       │───────────────────────>
         │                       │                       │
         │              5. 返回 userId                    │
         │<───────────────────────────────────────────────│
         │                       │                       │
         │  6. 登录成功 / 创建用户 │                       │
         │                       │                       │
```

### 1.2 前端回调地址配置

| 环境 | 回调地址 |
|------|----------|
| 开发 | `http://localhost:5173/auth/callback` |
| 测试 | `https://atlas-test.example.com/auth/callback` |
| 生产 | `https://atlas.example.com/auth/callback` |

**前端实现要点：**
- 登录页面添加"企业微信登录"按钮
- 点击后跳转 WeCom 授权页：`https://open.weixin.qq.com/connect/oauth2/authorize`
- 授权成功后携带 `code` 回调到前端页面
- 前端将 `code` 发送给后端换取 userId

### 1.3 后端回调接口设计

**接口 1: OAuth 回调接收**

```
POST /api/auth/wecom/callback
Content-Type: application/json

Request:
{
  "code": "STRING"  // WeCom 授权 code
}

Response (成功):
{
  "success": true,
  "data": {
    "token": "STRING",        // JWT token
    "user": {
      "id": "STRING",
      "weworkUserId": "STRING",
      "name": "STRING",
      "role": "EMPLOYEE | STORE_MANAGER | OPS_MANAGER"
    }
  }
}

Response (失败):
{
  "success": false,
  "error": {
    "code": "INVALID_CODE" | "USER_NOT_FOUND" | "USER_DISABLED",
    "message": "STRING"
  }
}
```

**接口 2: 登录状态校验**

```
GET /api/auth/me
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "user": { ... }
  }
}
```

### 1.4 code -> userId 换取流程

```typescript
// 后端服务实现伪代码
async function handleWecomCallback(code: string) {
  // 1. 用 code 换取 userId
  const accessToken = await getWecomAccessToken();
  const userInfo = await getWecomUserInfo(accessToken, code);
  const weworkUserId = userInfo.UserId;

  // 2. 查找或创建 Atlas 用户
  const user = await findOrCreateUser(weworkUserId);

  // 3. 生成 JWT token
  const token = generateToken(user);

  return { token, user };
}

// WeCom API 调用
async function getWecomUserInfo(accessToken: string, code: string) {
  const url = `https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo?access_token=${accessToken}&code=${code}`;
  const response = await fetch(url);
  return response.json(); // { UserId: "zhangsan" }
}
```

**WeCom API 注意事项：**
- 需要使用 `access_token` 调用用户信息接口
- `access_token` 需要用 `corpId` + `corpSecret` 获取
- 成员授权时返回的 `code` 只能使用一次，5分钟内有效

---

## 2. 用户映射策略

### 2.1 weworkUserId -> Atlas user 映射表设计

**数据库表结构：**

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wework_user_id  VARCHAR(64) UNIQUE NOT NULL,  -- 企业微信 UserID
  name            VARCHAR(128) NOT NULL,       -- 姓名（从 WeCom 同步）
  mobile          VARCHAR(20),                -- 手机号（可选）
  department_ids  TEXT[],                     -- 部门ID列表
  role            VARCHAR(20) NOT NULL DEFAULT 'EMPLOYEE',
  status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE | PENDING | DISABLED
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  
  -- 索引
  INDEX idx_wework_user_id (wework_user_id),
  INDEX idx_status (status)
);
```

**角色枚举：**
```typescript
enum UserRole {
  EMPLOYEE = 'EMPLOYEE',           // 普通员工
  STORE_MANAGER = 'STORE_MANAGER', // 店长
  OPS_MANAGER = 'OPS_MANAGER'      // 运营经理
}
```

### 2.2 未匹配用户的处理策略

| 场景 | 处理策略 | 说明 |
|------|----------|------|
| WeCom 用户首次登录 | **AUTO_CREATE + PENDING_ACCESS** | 自动创建用户，角色默认为 EMPLOYEE，状态设为 PENDING，等待管理员分配正式角色 |
| WeCom 用户已存在 | **直接登录** | 找到对应用户，生成 token，返回用户信息 |
| WeCom 用户已禁用 | **登录拒绝** | 返回错误码 `USER_DISABLED`，提示联系管理员 |
| WeCom 返回空 UserId | **登录失败** | 返回错误码 `INVALID_CODE` |

**_pending-access 页面设计：**
- 前端检测到用户状态为 `PENDING`，展示等待页面
- 提示："您的账号已创建，正在等待管理员分配权限"
- 提供刷新按钮或自动轮询状态

### 2.3 角色映射逻辑

**方案 A：WeCom 部门映射（推荐）**

```typescript
// 从 WeCom 获取用户部门，根据部门配置映射角色
async function mapRoleFromDepartment(userInfo: WeComUserInfo): Promise<UserRole> {
  const departmentMapping: Record<string, UserRole> = {
    'DEPT_STORE_001': 'STORE_MANAGER',   // 门店部门
    'DEPT_OPS_001': 'OPS_MANAGER',       // 运营部门
    // 其他默认 EMPLOYEE
  };
  
  const primaryDept = userInfo.department[0];
  return departmentMapping[primaryDept] || 'EMPLOYEE';
}
```

**方案 B：白名单映射（备选）**

```typescript
// 配置白名单，明确指定某些用户的角色
const roleWhitelist: Record<string, UserRole> = {
  'zhangsan': 'STORE_MANAGER',
  'wangjingli': 'OPS_MANAGER',
};
```

**推荐方案 A**，灵活且易于管理。

---

## 3. 配置管理

### 3.1 需要的环境变量

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `WECOM_CORP_ID` | 企业 ID | `ww1234567890abcdef` |
| `WECOM_AGENT_ID` | 应用 AgentID | `1000001` |
| `WECOM_SECRET` | 应用 Secret | `xxxxxxxxxxxxxxxxxxxx` |
| `WECOM_REDIRECT_URI` | 授权回调 URI | `http://localhost:5173/auth/callback` |

### 3.2 配置存放位置和加载方式

**开发环境：**
```bash
# .env.local 文件
WECOM_CORP_ID=wwtest...
WECOM_AGENT_ID=1000001
WECOM_SECRET=test_secret...
WECOM_REDIRECT_URI=http://localhost:5173/auth/callback
```

**后端配置加载：**
```typescript
// src/config/wecom.ts
import { z } from 'zod';

const WeComConfigSchema = z.object({
  corpId: z.string().min(1),
  agentId: z.string().min(1),
  secret: z.string().min(1),
  redirectUri: z.string().url(),
});

export function getWeComConfig(): WeComConfigSchema {
  return WeComConfigSchema.parse({
    corpId: process.env.WECOM_CORP_ID,
    agentId: process.env.WECOM_AGENT_ID,
    secret: process.env.WECOM_SECRET,
    redirectUri: process.env.WECOM_REDIRECT_URI,
  });
}
```

**前端配置：**
```typescript
// 前端通过环境变量或运行时配置获取
const WECOM_AUTH_URL = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${CORP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=snsapi_base#wechat_redirect`;
```

---

## 4. Sprint 2 首周任务拆分

### 任务总览

| 序号 | 任务 | 预估 | 依赖 |
|------|------|------|------|
| T1 | WeCom 后端 OAuth 接口开发 | 3d | - |
| T2 | WeCom 前端登录页面开发 | 2d | T1 (API 完成) |
| T3 | 用户映射表设计与迁移 | 2d | - |
| T4 | 角色映射逻辑实现 | 1d | T3 |
| T5 | PENDING_ACCESS 状态流开发 | 1d | T3 |
| T6 | 配置管理模块 | 0.5d | - |
| T7 | 本地开发环境联调 | 1d | T1, T2, T3 |
| T8 | 冒烟测试 | 0.5d | T7 |

### 详细拆分

#### T1: WeCom 后端 OAuth 接口开发 (3d)

**任务内容：**
- [ ] 实现 `POST /api/auth/wecom/callback` 接口
- [ ] 实现 access_token 获取与缓存逻辑
- [ ] 实现 code -> userId 换取逻辑
- [ ] 实现 findOrCreateUser 业务逻辑
- [ ] 实现 JWT token 生成
- [ ] 编写单元测试

**交付物：**
- 后端 API 代码
- API 文档更新
- 单元测试用例

**预估：** 3 人日

---

#### T2: WeCom 前端登录页面开发 (2d)

**任务内容：**
- [ ] 添加 WeCom 登录按钮组件
- [ ] 实现授权跳转逻辑
- [ ] 实现 callback 页面，接收 code
- [ ] 调用后端 API 完成登录
- [ ] 实现登录态管理（token 存储）
- [ ] 实现 PENDING_ACCESS 等待页面

**交付物：**
- 前端登录页面
- 登录态管理
- 等待页面

**依赖：** T1 (API 完成)

**预估：** 2 人日

---

#### T3: 用户映射表设计与迁移 (2d)

**任务内容：**
- [ ] 设计 users 表结构（含 wework_user_id）
- [ ] 编写数据库迁移脚本
- [ ] 实现 findOrCreateUser 方法
- [ ] 添加 status 字段（PENDING/ACTIVE/DISABLED）
- [ ] 迁移脚本测试

**交付物：**
- 数据库迁移文件
- ORM 模型更新

**预估：** 2 人日

---

#### T4: 角色映射逻辑实现 (1d)

**任务内容：**
- [ ] 实现部门 -> 角色映射逻辑
- [ ] 或实现白名单角色映射
- [ ] 添加默认 EMPLOYEE 角色逻辑
- [ ] 单元测试

**交付物：**
- 角色映射服务代码

**依赖：** T3

**预估：** 1 人日

---

#### T5: PENDING_ACCESS 状态流开发 (1d)

**任务内容：**
- [ ] 前端 PENDING 状态检测
- [ ] 等待页面 UI 实现
- [ ] 自动刷新或手动刷新逻辑
- [ ] （可选）管理员分配角色 API

**交付物：**
- 等待页面
- 状态轮询逻辑

**依赖：** T3

**预估：** 1 人日

---

#### T6: 配置管理模块 (0.5d)

**任务内容：**
- [ ] 环境变量校验
- [ ] 配置加载封装
- [ ] 开发环境 .env.example 文件

**交付物：**
- 配置文件
- .env.example

**预估：** 0.5 人日

---

#### T7: 本地开发环境联调 (1d)

**任务内容：**
- [ ] 前后端联调
- [ ] 真实 WeCom OAuth 流程测试
- [ ] 修复发现的问题

**交付物：**
- 联调通过

**依赖：** T1, T2, T3

**预估：** 1 人日

---

#### T8: 冒烟测试 (0.5d)

**任务内容：**
- [ ] 新用户首次登录测试
- [ ] 老用户重复登录测试
- [ ] 角色映射验证
- [ ] 异常场景测试（无效 code、禁用用户等）

**交付物：**
- 测试报告

**预估：** 0.5 人日

---

### Sprint 2 首周验收标准

- [ ] WeCom OAuth 登录可完成（前后端联调通过）
- [ ] 用户可正常注册到 Atlas 系统
- [ ] 角色映射正确（基于部门或白名单）
- [ ] PENDING_ACCESS 用户有等待页面
- [ ] 配置管理模块就绪
- [ ] 完成冒烟测试

---

## 5. 待定事项（不属于首周）

以下事项暂不纳入 Sprint 2 首周范围，后续迭代：

- [ ] 请假数据同步（需与 WeCom 请假流程对接）
- [ ] 审批结果回写 WeCom
- [ ] 企业微信消息通知
- [ ] 管理员分配角色后台
- [ ] 多企业支持

---

## 6. 参考资料

- [WeCom OAuth2.0 授权登录](https://developer.work.weixin.qq.com/document/15803)
- [获取访问令牌](https://developer.work.weixin.qq.com/document/15803)
- [成员OAuth2.0授权登录](https://developer.work.weixin.qq.com/document/15803)

---

*文档创建：2026-03-12*
