# Atlas Sprint 2 Playbook

> Sprint 启动：2026-03-22
> 目标：接入企业微信 OAuth 登录，实现真实用户体系

---

## Sprint 2 目标

1. 接入 WeCom OAuth 登录
2. 实现用户映射与登录态管理
3. 打通持久化数据层
4. 基础排班 API 联调

---

## 已获取的 WeCom 凭证

```
CorpID: ww836bae156556f03f
AgentID: aibhh8SklrT3Hs02kh4FlU4zXvb01qADRA6
Secret: LVqTKnnMw7VhEBrUiUQ7FcKHKhQWzX7hxV2P4DnvhYT
```

凭证已写入：
- `atlas-server/.env`
- `atlas-web/.env`

---

## Sprint 2 任务分解

### P0：WeCom OAuth 登录

1. **后端：WeCom OAuth 接入**
   - [ ] 配置 WeCom OAuth 回调地址
   - [ ] 实现 /api/auth/wework/login 接口
   - [ ] 实现 /api/auth/wework/callback 接口
   - [ ] 获取用户 userid 并映射到 Atlas 用户

2. **前端：登录页改造**
   - [ ] 添加"企业微信登录"按钮
   - [ ] 实现 OAuth 跳转逻辑
   - [ ] 处理回调并显示用户信息

3. **数据层：用户表**
   - [ ] 创建 users 表（关联 wework_user_id）
   - [ ] 实现用户首次登录自动创建

### P1：权限体系对接

4. **RBAC + WeCom 部门映射**
   - [ ] 获取用户在 WeCom 的部门和角色
   - [ ] 映射到 Atlas 的员工/店长/运营经理权限

### P2：基础排班 API

5. **员工排班查询**
   - [ ] 获取当前用户的班表
   - [ ] 对接后端真实 API

6. **店长排班管理**
   - [ ] 班次创建/编辑/提交审批
   - [ ] 审批流程对接

---

## WeCom 应用配置清单

在 WeCom 管理后台需要配置：

- [ ] 设置应用可信域名
- [ ] 配置 OAuth 回调地址：`http://localhost:5173/auth/callback`
- [ ] 获取测试账号的 userid
- [ ] 配置权限（获取部门、成员列表等）

---

## Sprint 2 验收标准

- [ ] WeCom OAuth 登录流程可演示
- [ ] 员工可查看自己的排班
- [ ] 店长可创建并提交排班审批
- [ ] 数据持久化到 PostgreSQL

---

## 注意事项

1. **网络**：Atlas 后端需要能访问 `https://qyapi.weixin.qq.com`
2. **CORS**：后端需要允许前端域名的跨域请求
3. **Token**：WeCom access_token 有 7200 秒过期，需处理刷新

---

## 企微应用设置指南

### 在企微管理后台配置：

1. **应用管理** → 选择应用 → **企业微信授权登录**
   - 开启"网页授权及JS-SDK"

2. **应用主页**
   - 设置主页地址为 Atlas 前端地址

3. **接口权限**
   - 确保有「读取成员」权限

### OAuth 回调域名：

在「企业微信授权登录」中配置：
- `127.0.0.1` (开发环境)
- 正式环境需要公网域名
