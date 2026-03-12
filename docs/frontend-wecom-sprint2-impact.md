# Atlas Frontend Impact Note — Sprint 2 WeCom 登录首波接入

更新时间：2026-03-12  
范围：**仅前端 / H5 集成视角**，不涉及后端业务逻辑改造方案。

---

## 1. 当前前端现状（atlas-web）

### 1.1 登录 / 会话 / 路由现状

当前登录链路已从纯 Sprint 1 mock 形态明显前进，但**仍存在会掩盖真实联调结果的 mock/fallback 残留**：

- `src/views/common/LoginView.vue`
  - 不应再被描述为纯“三角色 mock 入口页”；当前规划重点是继续巩固 real-auth-first 入口，并把 mock 入口限制在 dev/demo 语义
- `src/views/common/AuthCallbackView.vue`
  - 不应再被描述为纯“有 code 就按 role 伪登录”的骨架；当前风险重点已转为：真实 callback 失败时，前端是否仍可能被 fallback/mask 掩盖
- `src/stores/session.ts`
  - 本地 session bootstrap 仍是高风险点
  - 启动时会尝试 `GET /api/auth/me`
  - **如果 `/auth/me` 失败后仍保留旧 session 或继续让页面显得可用，就会掩盖真实登录失败**
- `src/router/index.ts`
  - 公共路由：`/login`、`/auth/callback`、`/pending-access`
  - 其余页面靠本地 session + role 守卫控制

### 1.2 数据加载现状

当前业务页存在较多 **API 优先 + 本地 mock fallback** 的混合模式：

- `src/api/atlas.ts`
  - `fetchEmployeeScheduleWithFallback()`
  - `fetchApprovalsWithFallback()`
  - `fetchApprovalDetailWithFallback()`
  - `fetchManagerScheduleWithFallback()`
- `src/views/home/HomeView.vue`
  - 首页摘要仍完全来自 `src/api/mock.ts`
- 多个页面 UI 上已明确提示“失败时回退本地 mock”

这些能力对 Sprint 1 demo 曾经合适，但在当前 Sprint 2 阶段，真正需要追踪的风险已经收敛为：

> **用户已经真实登录成功，但页面仍可能因为局部 fallback 看起来“可用”，从而掩盖真实 session / 权限 / 数据链路问题。**

---

## 2. Sprint 2 首波接入时，前端必须变动的点

## 2.1 登录入口页 `/login`

目标：保持 **真实企微授权为主入口**，并避免 mock 入口继续污染验收结论。

当前文件：`src/views/common/LoginView.vue`

需要变化：

1. 移除或弱化 3 个 mock 角色登录主入口
   - 最多保留成 **dev-only 调试入口**，不能继续作为默认主 CTA
2. 增加真实登录主按钮
   - 例如：`企业微信登录`
3. 登录按钮点击后，改为：
   - 调后端获取授权地址（如 `/api/auth/wework/url`），或
   - 使用前端配置直接拼接 OAuth 跳转地址（更不推荐）
4. 增加环境提示
   - 当前是否为企微内打开
   - 非企微环境下的提示文案
5. 登录失败态需要从“mock 登录失败”改为“授权地址获取失败 / 当前环境不支持”

### 建议

Sprint 2 首波只做 **一个真实登录按钮 + 一个隐藏/弱化的 mock 调试入口**，不要同时在 UI 上并排放三个大角色按钮，否则会继续污染真实登录路径。

---

## 2.2 回调页 `/auth/callback`

目标：从“有 code 就伪登录”改成“真实 callback 交换 session”。

当前文件：`src/views/common/AuthCallbackView.vue`

需要变化：

1. 不再依赖 `?role=` 决定登录身份
2. 读取 `code` / `state`
3. 调后端真实 callback 接口（例如 `POST /api/auth/wework/callback`）
4. 后端返回 token + user 后，写入 session store
5. 根据真实 user.role 做跳转：
   - `employee|manager|operation` → `/home`
   - `pending` → `/pending-access`
6. 若 callback 失败：
   - 展示真实错误
   - 提供返回 `/login` / 重试能力

### 当前风险

当前不应再把 `AuthCallbackView` 描述成单纯的“mock 假跑页”；更准确的风险表述是：

- 即使 callback 已按 real-auth-first 方向实现，前端仍可能因为旧 session / fallback / mock 数据而让结果“看起来成功”
- QA 可能无法仅凭页面表现区分：真实 callback 成功、`pendingAccess`、还是 callback 失败后被前端掩盖
- 因此这个页面依然是 Sprint 2 **最不能接受模糊结果** 的地方

---

## 2.3 Session bootstrap（应用启动鉴权）

目标：把剩余风险收敛到“真实登录态优先，mock 仅限显式开发模式”，避免 bootstrap 掩盖真实失败。

当前文件：`src/stores/session.ts`

需要变化：

1. `STORAGE_KEY = 'atlas_demo_session'` 命名应改为中性，如：
   - `atlas_session`
2. `bootstrapSession()` 逻辑要收紧：
   - 当前：有缓存 token 且 `/auth/me` 失败 → 继续保留旧 session
   - Sprint 2 建议：
     - 真实登录模式下，`/auth/me` 失败应清空 session，并回到 `/login`
     - mock/dev 模式才允许继续保留本地 session
3. `loginAs()` 这类 mock helper 应与真实登录写 session 的逻辑解耦
4. 建议补一个显式的 `setSession()` / `clearSession()`

### 当前风险

`bootstrapSession()` 的 catch 分支会保留旧 token/session，这会掩盖：

- token 已过期
- callback 没写对 token
- `/auth/me` 鉴权失败
- API base URL 配错

结果就是：**看起来登录过，实际上鉴权链路已经断了。**

---

## 2.4 路由守卫

当前文件：`src/router/index.ts`

当前守卫逻辑本身不复杂，结构可以继续用，但要注意两件事：

1. `/auth/callback` 必须继续保留为 public route
2. 若真实登录模式下 session bootstrap 失败，不应再放任业务页靠旧缓存进入

建议首波不大改 router，只让它配合收紧后的 session store 即可。

---

## 2.5 待开通页 `/pending-access`

当前文件：`src/views/common/PendingAccessView.vue`

这个页面 Sprint 2 会从“占位页”变成真实承接页。

需要确认：

- `mapRole()` 未识别角色时会落到 `pending`
- callback 与 `/auth/me` 刷新逻辑都能稳定导到这里
- 页面上最好提供：
  - 刷新当前状态
  - 返回登录页
  - 联系管理员提示

如果后端在企微身份映射未完成时返回的是“已识别身份但无 Atlas 角色”，那么该页会成为首波真实联调中的高频路径。

---

## 3. 目前哪些 fallback/mock 会掩盖真实接入问题

以下是 Sprint 2 需要重点警惕的“看起来能用，但会遮蔽真实问题”的位置。

## 3.1 最大风险：session bootstrap 容错

文件：`src/stores/session.ts`

问题：

- 本地 session 还在时，即便 `/api/auth/me` 已失败，前端仍继续认为用户已登录

会掩盖的问题：

- callback token 无效
- token 过期
- API base URL 错误
- 跨域 / cookie / header 问题

---

## 3.2 首页仍完全使用前端 mock 数据

文件：`src/views/home/HomeView.vue`

问题：

- 首页摘要、快捷入口、待办仍是本地 mock
- 真实登录后首页仍会显得“很完整”

会掩盖的问题：

- 当前用户门店信息未正确刷新
- 角色首页应该展示的真实摘要接口还没接好
- 登录虽成功，但实际业务接口没有通

### 建议

Sprint 2 首波可以暂时不做真实 dashboard 接口，但要：

- 在 UI 上明确标记“首页摘要仍为 mock”
- 避免把首页是否成功展示，当成 WeCom 登录成功的验收标准

---

## 3.3 员工/审批/店长页的 fallback API 包装

文件：`src/api/atlas.ts`

相关函数：

- `fetchEmployeeScheduleWithFallback()`
- `fetchApprovalsWithFallback()`
- `fetchApprovalDetailWithFallback()`
- `fetchManagerScheduleWithFallback()`

问题：

- 真实接口失败时，页面会直接掉到本地 mock

会掩盖的问题：

- 登录后鉴权头没带上
- 角色 RBAC 不对
- 后端真实接口路径/返回结构变了
- 门店映射或员工范围不对

### Sprint 2 建议

首波 WeCom 登录联调阶段，至少要有一种明显策略：

- **真实登录模式下，对关键页关闭静默 fallback**；或
- 保留 fallback，但在页面顶部强提示“当前为 mock fallback，真实接口未通”

如果继续静默回退，联调会非常难排错。

---

## 4. env / 配置需求（前端侧）

当前 `.env.example` 只有：

```env
VITE_API_BASE_URL=http://127.0.0.1:3100/api
```

对于 Sprint 2 WeCom 登录，前端至少要明确以下配置边界。

## 4.1 必要：API base URL

继续保留：

- `VITE_API_BASE_URL`

用途：

- callback 交换 session
- `/auth/me`
- 后续所有业务接口

风险：

- 若 callback 页部署域名与 API 不同，联调时最容易踩跨域 / 错域名问题

---

## 4.2 必要：前端 Web base URL / callback base

建议新增前端配置（名称可调整，但要有这个概念）：

- `VITE_APP_BASE_URL`

用途：

- 前端自己构造 callback URL 时使用
- 或至少用于调试展示“当前前端回调地址应该是什么”

典型值：

- 开发：`http://127.0.0.1:5173`
- 测试：`https://atlas-test.xxx.com`
- 生产：`https://atlas.xxx.com`

对应 callback 路径：

- `${VITE_APP_BASE_URL}/auth/callback`

### 为什么前端需要它

虽然 OAuth URL 最好由后端统一生成，但前端联调文档和错误提示里，必须知道：

- 当前站点的对外基地址是什么
- 最终回跳到哪个 callback URL

否则很难定位“企微后台配置域名不匹配”这类问题。

---

## 4.3 可选：是否开启 mock / debug 登录

建议新增前端开关（任选其一命名风格）：

- `VITE_ENABLE_MOCK_LOGIN=false`
- 或 `VITE_AUTH_MODE=wecom|mock`

用途：

- 明确区分 Sprint 2 联调环境与 Sprint 1 demo 环境

### 建议

我更推荐：

- `VITE_ENABLE_MOCK_LOGIN=true|false`

这样改动最小，也最利于把现有 `loginAs()` 限制在开发调试路径里。

---

## 5. 推荐的 Sprint 2 首个 UI 集成切片

我不建议在当前阶段重新把范围扩成 login + callback + dashboard + 全部业务页的大改。当前更合理的是：先在已有 real-auth-first 骨架上收紧 masking 风险。

### 最稳的当前切片

**切片目标：在真实 WeCom 登录链已具备基础骨架的前提下，优先确保失败不会被假装成成功。**

包含范围：

1. `/login`
   - 保持真实“企业微信登录”为主入口
   - mock 入口仅保留为 dev-only / demo-only
2. `/auth/callback`
   - 继续按真实 callback 结果分支
   - 明确暴露 success / `pendingAccess` / failure，不允许模糊成功
3. `session.ts`
   - 收紧 bootstrap 对失效 session 的处理
   - 禁止真实登录模式下继续保留会误导 QA 的旧 session
4. 关键业务页 fallback
   - 至少在审批列表、审批详情、店长排班、员工排班上取消静默 fallback 或明确打标
5. `/home`
   - 继续允许首页 mock 摘要存在，但必须明确其不是 auth acceptance evidence

### 该切片的验收标准

最小验收建议：

1. 未登录访问 `/home` 会被送去 `/login`
2. 点击“企业微信登录”能正确离站授权并回到 `/auth/callback`
3. callback 成功后：
   - 有角色用户 → `/home`
   - 无角色用户 → `/pending-access`
4. 刷新页面后，`/auth/me` 仍能恢复登录态
5. token/session 失效后，刷新不会继续假装登录成功

### 为什么这是最佳第一刀

因为这条链先证明的是：

- 企微回调域名配置正确
- callback API 正常
- token/session 存储方式正确
- 路由守卫行为正确
- 用户角色映射最起码可读

这比“顺便把所有业务页都改真”更值钱，也更容易定位问题。

---

## 6. 具体文件影响清单

### 高优先级会改动

- `atlas-web/src/views/common/LoginView.vue`
- `atlas-web/src/views/common/AuthCallbackView.vue`
- `atlas-web/src/stores/session.ts`
- `atlas-web/src/router/index.ts`
- `atlas-web/.env.example`

### 中优先级可能随后改动

- `atlas-web/src/api/client.ts`
- `atlas-web/src/views/common/PendingAccessView.vue`
- `atlas-web/src/views/home/HomeView.vue`

### 暂不建议首波就动太多的文件

- `atlas-web/src/api/mock.ts`
- `atlas-web/src/views/employee/EmployeeScheduleView.vue`
- `atlas-web/src/views/manager/ManagerScheduleView.vue`
- `atlas-web/src/views/approval/*`

这些页面可以等登录链路稳定后，再逐步收紧 fallback。

---

## 7. 前端 blockers / 依赖

Sprint 2 首波前端接入依赖后端/配置侧至少明确以下内容：

1. **真实 callback 接口契约**
   - URL
   - method
   - 请求参数（`code` / `state`）
   - 返回 token / user 结构
2. **`/api/auth/me` 的稳定返回结构**
   - 角色枚举是否仍是：`employee | manager | operation_manager`
3. **待开通用户语义**
   - 后端是返回特定 role，还是报错码，还是 `enabled=false`
4. **OAuth 发起方式**
   - 前端拿授权 URL 再跳，还是后端直接 302
5. **前端对外访问域名**
   - 用于企微后台配置可信回调域名 / JS 接口域名
6. **跨域/鉴权方案**
   - JWT header 模式 or cookie 模式
   - 当前前端代码更偏向 JWT Bearer header

如果这些接口/配置语义不先定，前端很容易写了又返工。

---

## 8. 结论

对当前 atlas-web 来说，Sprint 2 真正的首要工作不是重新定义整个前端登录骨架，而是：

> **在已存在的 real-auth-first 骨架上，去掉会掩盖真实失败的 masking/fallback 行为。**

最关键的三个点：

1. 保持 `LoginView` / `AuthCallbackView` 的真实登录主路径，不让 mock 重新成为默认解释
2. `bootstrapSession()` 不再默默保留失效本地 session
3. 关键业务页 fallback 必须被移除或明确标记，不能再让 QA 把 mock 可用性误读成真实联调成功

只要这三处没收紧，后面的排班/审批联调结果都会被 fallback 干扰。
