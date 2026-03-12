# Atlas Sprint 2 Kickoff — WeCom Integration First Wave

> 角色：Tech Lead
> 更新时间：2026-03-12
> 目的：把 Sprint 2 首波范围、依赖、顺序、角色分工一次性讲清，避免前后端/QA 各自开工后再返工。

---

## 1. Sprint 2 首波目标

Sprint 2 不再继续扩展 mock MVP 页面能力，而是把 **“真实 WeCom 登录接入 + 本地用户映射 + 基础持久化骨架”** 作为首波落地主题。

本波完成后，团队应该得到以下结果：

1. 企微内打开 Atlas 时，能够走真实 OAuth/code 登录链路；
2. 后端能基于 WeCom 身份建立 Atlas 本地登录态；
3. 未开通用户不会误入系统，而是进入明确的 pending-access 承接页；
4. 用户、门店、员工归属、班次等核心主数据有最小持久化骨架，而不是继续完全依赖内存/mock；
5. 前后端联调对象从 “mock 用户 ID” 切换到 “真实 weworkUserId + 本地 Atlas user”。

---

## 2. 首波范围（建议锁定为 P0）

### 2.1 必做范围

#### A. WeCom OAuth 登录主链路
- 前端支持企微环境检测、code 获取、登录回跳处理；
- 后端提供真实 `POST /api/auth/wework/callback`；
- 后端用 `CorpID / AgentID / Secret` 向企微换取用户身份；
- 登录成功后返回 Atlas 本地会话/JWT 与基础用户信息。

#### B. 本地用户映射与 pending-access
- 建立 `weworkUserId -> Atlas user` 映射；
- 明确首次登录但未分配角色/门店时的返回语义；
- 前端提供待开通/未授权承接页，不允许直接进入业务页面；
- `GET /api/auth/me` 返回真实角色、门店归属、权限集合。

#### C. 基础持久化骨架
- 落 `users / stores / store_staffs / store_rules / shift_templates` 最小 schema；
- 后端基础读取接口改为优先走持久化数据，而不是只走 mock 内存；
- 保留必要 seed/test data，方便测试环境联调。

#### D. 配置与可观测性最小闭环
- 明确环境变量与示例配置：`WEWORK_CORP_ID / WEWORK_AGENT_ID / WEWORK_SECRET / WEWORK_REDIRECT_URI / JWT_SECRET`；
- 记录登录失败与企微调用失败日志；
- 至少为登录链路保留 requestId / 错误码 / 原因分类。

### 2.2 明确不放入首波阻塞

以下项可以保留接口/设计，但**不要绑进 Sprint 2 首波验收**：

- 企微请假同步全量闭环；
- 审批回写企微；
- 企微消息通知完善；
- 复杂通讯录全量同步；
- 智能排班、换班、通知中心。

---

## 3. 关键依赖与阻塞项

以下依赖若不齐，Sprint 2 首波无法实质联调：

### 3.1 WeCom 应用配置
必须拿到：
- `CorpID`
- `AgentID`
- `Secret`

如果这三项缺任何一个，后端只能停留在假实现或本地 stub，不能称为真实 kickoff。

### 3.2 回调 URL / 域名
必须提前确定：
- 前端承接 OAuth 回跳的页面 URL；
- 后端 `wework/callback` 的可访问域名；
- 测试环境是否能被企微访问；
- 若需要 HTTPS，证书与反向代理由谁提供。

> 这里最容易被低估。没有稳定域名/回调地址，前端和后端都无法做真联调。

### 3.3 用户映射规则
必须明确：
- 企微 `userid` 是否作为系统外部唯一键；
- 本地用户是预同步创建，还是首次登录时按白名单补建；
- 一个用户是否允许多门店任职；
- 角色来源是 Atlas 本地配置，而不是企微直接透传。

### 3.4 pending-access 策略
必须先拍板：
- 未开通账号的用户看到什么页面；
- 是否允许显示“已识别身份，但待管理员开通”；
- 是否需要记录首次访问申请；
- 谁负责后续开通操作（手工配置/导入/后台管理）。

如果这条不先定，前端承接页和后端错误语义会反复返工。

### 3.5 测试环境 / 测试账号
至少需要：
- 1 个店长测试账号；
- 1 个员工测试账号；
- 1 个运营经理测试账号；
- 对应门店与员工归属数据；
- 可反复清理/重置的测试数据集。

没有真实角色账号，QA 无法完成 Sprint 2 首波的角色验证。

---

## 4. 建议技术顺序（按依赖最小返工排序）

### Step 1：先冻结登录合同与错误语义
Tech Lead 先确认并冻结：
- `POST /api/auth/wework/callback` 请求/响应结构；
- `GET /api/auth/me` 返回字段；
- 未开通用户、企微鉴权失败、非企微环境访问的错误码与文案；
- 前端登录页/回跳页/待开通页状态机。

### Step 2：后端先落配置、适配器、持久化骨架
Backend 先完成：
- WeCom client 封装；
- auth service 基础结构；
- users / stores / store_staffs 等最小 schema；
- 用户查找与映射逻辑；
- `auth/me` 真数据返回。

### Step 3：前端接登录与身份态，不先碰深业务页
Frontend 先完成：
- 企微环境检测；
- OAuth 回跳页；
- 登录 loading / 失败 / 待开通承接；
- 全局 auth store 从 mock 切换为真实身份态；
- 首页路由守卫按真实 `me` 工作。

### Step 4：QA 先做登录矩阵，不先做排班深测
QA 首波只需要验证：
- 三种角色账号是否可正确登录；
- 未开通账号是否正确落 pending-access；
- 错误回调/失效 code 是否正确报错；
- `auth/me` 权限与前端落页是否一致。

### Step 5：再进入持久化基础读接口联调
登录稳定后，再扩到：
- `GET /api/stores`
- `GET /api/stores/:id/shifts`
- `GET /api/employees`

此时才开始替换更多 mock 数据读取。

---

## 5. 角色边界与并行方式

### 5.1 Frontend（首波边界）

**负责：**
- 企微环境检测与 OAuth 回跳处理；
- 登录 loading / 失败 / 待开通页面；
- 路由守卫、会话持久化、`auth/me` 装载；
- 首页按真实角色跳转。

**暂不负责：**
- 新排班业务功能扩展；
- 请假同步页面；
- 通知中心；
- 大规模页面重构。

### 5.2 Backend（首波边界）

**负责：**
- WeCom OAuth 换取身份；
- 本地用户映射；
- pending-access 返回语义；
- `auth/me` 真数据；
- 基础 schema 与 seed/test data；
- stores/employees/shifts 最小真数据读取能力。

**暂不负责：**
- 完整请假回调闭环；
- 审批回写 WeCom；
- 全量通知系统；
- 智能排班算法。

### 5.3 QA（首波边界）

**负责：**
- 企微内登录矩阵；
- 非企微环境/异常 code/未开通账号 case；
- 角色落页与权限 smoke；
- 测试数据准备与回归记录模板。

**暂不负责：**
- 深度排班规则回归；
- 请假同步全链路测试；
- 消息通知压测。

---

## 6. 推荐验收口径（Sprint 2 first wave exit criteria）

满足以下条件即可认为 Sprint 2 首波完成：

1. 测试环境内可通过真实 WeCom code 登录 Atlas；
2. 已开通的店长 / 员工 / 运营经理账号都能进入正确角色首页；
3. 未开通用户统一进入 pending-access 承接页；
4. `GET /api/auth/me`、`GET /api/stores`、`GET /api/employees`、`GET /api/stores/:id/shifts` 至少一组真数据联调成功；
5. 登录失败与映射失败可定位，不是无提示白屏；
6. 前端核心登录态不再依赖 mock userId 作为主入口。

---

## 7. Tech Lead 结论

Sprint 2 首波最重要的不是“把更多页面做出来”，而是**把身份源从 mock 切到真实 WeCom，并把本地用户/角色/门店关系立住**。这一步如果不先做实，后面的请假同步、审批、通知都会建立在不稳定地基上。

所以推荐的推进方式是：

**先登录与映射，后基础持久化读接口，再扩请假/通知/更深业务。**

这是 Sprint 2 最小且正确的 kickoff 切法。
