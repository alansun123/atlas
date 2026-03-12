# Atlas QA Round 2（面向可演示 MVP）

> 日期：2026-03-12  
> 角色：QA  
> 目标：围绕“可演示 MVP”做一轮收敛，重点确认文档与代码是否一致、前后端是否能跑、mock 链路是否闭环。

---

## 1. 本轮结论

Atlas 相比 Round 1 已经前进了一步：**后端已从 placeholder 进化为可运行的 mock MVP API**，并且能跑通“mock 登录 → 校验排班 → 提交审批 → 审批通过 → 发布”的后端链路。

但项目还**不能判定为“完整可演示 MVP”**，原因也很直接：

1. **前端 `atlas-web/` 仍只有空目录骨架，无法安装、无法启动、无法验证页面。**
2. **文档整体仍以“前后端都在推进/已有页面”为叙述口径，和当前仓库真实状态不完全一致。**
3. **后端虽然可跑，但 RBAC、待开通用户、员工可见已发布班表等演示关键约束还没收紧。**

换句话说：

- **后端 mock 闭环：基本成立**
- **前后端联调闭环：尚未成立**
- **演示口径一致性：仍需收口**

---

## 2. 本轮更贴近目标的验收清单

> 这份清单不是“理想 MVP 全量表”，而是“本轮要不要能演示”的收敛版。

### 2.1 P0：演示必过

#### A. 工程与启动
- [x] `atlas-server/` 存在且 `npm start` 可启动
- [x] 后端支持通过环境变量切换端口（已用 `PORT=3100` 验证）
- [ ] `atlas-web/` 存在可运行工程（当前缺 `package.json` / `index.html` / Vite 配置）
- [ ] 前端可执行 `npm install`
- [ ] 前端可执行 `npm run dev`
- [ ] 仓库根目录提供统一启动说明（至少说明前后端端口与依赖）

#### B. Mock 登录与角色承接
- [x] 后端存在 mock 登录：`POST /api/auth/mock/login`
- [x] 后端存在 `GET /api/auth/me`
- [x] 未登录访问受保护接口会返回 `2001`
- [ ] 前端存在登录页 / 登录入口
- [ ] 前端存在角色分流页 `/home`
- [ ] 存在待开通用户承接页 `/pending-access`
- [ ] mock 账号口径与文档一致

#### C. 员工 / 店长 / 运营经理主链路
- [x] 店长可创建排班批次
- [x] 店长可校验排班并拿到 issue 列表
- [x] 命中异常后可提交审批
- [x] 运营经理可查看待审批列表
- [x] 审批通过后可发布批次
- [ ] 员工前端可查看“我的班表”
- [ ] 店长前端可查看/编辑排班
- [ ] 运营经理前端可查看审批列表与详情

#### D. 演示一致性
- [x] 后端路由已统一为复数资源风格（`/api/schedules`、`/api/leaves`、`/api/approvals`）
- [ ] README / 架构 / API / 前端页面文档已统一更新到“前端未落地、后端 mock 已落地”的当前状态
- [ ] 文档中的 mock 用户、页面、状态流与真实代码一致

### 2.2 P1：建议本轮顺手补齐
- [ ] 增加 `.env.example` 或根目录环境说明
- [ ] 提供前端联调 baseURL 说明（避免默认占用 3000 时冲突）
- [ ] 提供一份可直接执行的 smoke checklist
- [ ] 明确员工只能看到 `published` 班表，而不是 draft
- [ ] 增加待开通 mock 用户
- [ ] 收紧审批/发布等接口的角色权限

### 2.3 P2：可在后续迭代处理
- [ ] 真实企微登录替换 mock 登录
- [ ] MySQL / ORM / migration 落地
- [ ] 单测 / 集成测试
- [ ] 前端页面细节、移动端体验、空态优化

---

## 3. 本轮新改动下的可执行冒烟验证方案

> Round 1 之后，后端已有明显新改动，值得执行一套“只验证当前真实能力”的冒烟方案。前端暂无可跑产物，因此本轮冒烟以后端为主，前端只保留阻塞项。

### 3.1 冒烟前提

- 工作目录：`projects/atlas/atlas-server`
- 建议端口：`3100`
- 原因：本机 `3000` 已被其他服务占用；若仍按文档默认端口运行，容易把“端口冲突”误判为“后端不可启动”。

### 3.2 后端冒烟步骤（已验证可执行）

#### 1）启动后端
```bash
cd atlas-server
PORT=3100 npm start
```

预期：控制台出现 `Atlas server listening on port 3100`

#### 2）健康检查
```bash
curl http://127.0.0.1:3100/health
```

预期：返回统一结构，`data.status = ok`

#### 3）mock 店长登录
```bash
curl -X POST http://127.0.0.1:3100/api/auth/mock/login \
  -H 'Content-Type: application/json' \
  -d '{"userId":101}'
```

预期：返回 `accessToken=101`，用户角色为 `manager`

#### 4）获取当前用户
```bash
curl http://127.0.0.1:3100/api/auth/me \
  -H 'Authorization: Bearer 101'
```

预期：返回当前店长信息与所属门店

#### 5）校验示例排班批次
```bash
curl -X POST http://127.0.0.1:3100/api/schedules/batches/10001/validate \
  -H 'Authorization: Bearer 101'
```

预期：返回 `passed=false`，且含 `UNDER_MIN_STAFF`

#### 6）提交审批
```bash
curl -X POST http://127.0.0.1:3100/api/schedules/batches/10001/submit-approval \
  -H 'Authorization: Bearer 101' \
  -H 'Content-Type: application/json' \
  -d '{"triggerReasons":["UNDER_MIN_STAFF","NEW_EMPLOYEE_FIRST_WEEK"],"comment":"QA smoke"}'
```

预期：返回 `pending_approval` 与 `approvalId`

#### 7）运营经理查看待审批
```bash
curl http://127.0.0.1:3100/api/approvals/pending \
  -H 'Authorization: Bearer 201'
```

预期：待审批列表中出现刚提交记录

#### 8）审批通过
```bash
curl -X POST http://127.0.0.1:3100/api/approvals/<approvalId>/approve \
  -H 'Authorization: Bearer 201' \
  -H 'Content-Type: application/json' \
  -d '{"comment":"approved in smoke"}'
```

预期：审批状态为 `approved`

#### 9）发布排班
```bash
curl -X POST http://127.0.0.1:3100/api/schedules/batches/10001/publish \
  -H 'Authorization: Bearer 101' \
  -H 'Content-Type: application/json' \
  -d '{"notifyEmployees":false}'
```

预期：批次状态变为 `published`

### 3.3 前端冒烟步骤

当前**无法执行**，阻塞原因明确：

- `atlas-web/` 下无 `package.json`
- 无 `index.html`
- 无 `src/main.*` / `App.*`
- 无 Vite 配置

因此本轮前端冒烟结论只能是：

- **阻塞，不是失败。**
- 阻塞点在“前端尚未提交可运行产物”，不是 QA 用例本身设计有问题。

---

## 4. 当前问题一页收敛（P0 / P1 / P2）

## P0

### P0-1 前端仍不可运行，导致演示链路只剩后端 API
- 现状：`atlas-web/` 只有空目录骨架，没有可启动前端工程。
- 影响：无法验证登录页、首页、员工班表、店长排班页、审批页；无法对外做完整 MVP 演示。
- 建议：先补最小 Vite 工程与路由壳，不追求完整页面，但要能跑通登录/首页/审批列表三个壳页面。

### P0-2 文档与代码仍未完全对齐，尤其是“前端已存在/可联调”的暗示性表述
- 现状：多份文档仍以页面设计和联调口径展开，但真实仓库没有可运行前端。
- 影响：研发、QA、演示方对当前完成度判断偏乐观。
- 建议：统一改成“后端 mock MVP 已落地，前端待补最小可运行壳”。

### P0-3 权限未收紧，演示链路存在角色穿透
- 实测：
  - 员工 `102` 可创建排班批次
  - 员工 `102` 可提交审批
  - 员工 `102` 可发布排班
  - 店长 `101` 可直接审批 `approve`
- 影响：即使前端做了按钮隐藏，接口层仍无法保证演示口径；后续联调极易出现“换 token 直接越权”。
- 建议：至少在后端为 `schedule:create / publish`、`approval:action` 增加角色校验。

## P1

### P1-1 默认端口与本机现状冲突，README-backend 可执行性不足
- 现状：后端默认端口写为 `3000`，而本机 `3000` 已被其他服务占用。
- 实测：直接 `npm start` 触发 `EADDRINUSE`；改为 `PORT=3100 npm start` 后服务正常。
- 影响：新同学按 README 执行时，容易误判为“代码起不来”。
- 建议：文档增加“若 3000 被占用，请显式设置 PORT”的说明，或默认改用未冲突端口。

### P1-2 mock 用户口径与测试文档不一致
- 现状：
  - 代码中的可用用户是 `101/102/201/202/203/204`
  - `docs/mock-test-cases.md` 中仍写 `employee01 / manager01 / op01 / pending01`
- 影响：测试步骤无法直接照抄执行。
- 建议：文档改成真实可用 userId / weworkUserId，或代码补一层别名映射。

### P1-3 “待开通用户”文档已设计，但代码未提供可验证样本
- 现状：文档多处提到 `/pending-access` 与未开通用户流程；mock 数据中没有对应用户，后端也没有相关承接逻辑。
- 影响：P0 页面虽设计了，但无法演示。
- 建议：补一个 `pending_activation` 用户，并在登录/`me` 接口中返回明确状态。

### P1-4 员工“我的班表”当前返回 draft，和常见演示口径不符
- 实测：`GET /api/schedules/me` 返回了 `status: draft` 的班次。
- 影响：如果前端直接展示，会和“员工看已发布班表”相冲突。
- 建议：默认仅返回 `published`；若保留草稿视图，需明确区分角色和展示目的。

## P2

### P2-1 架构文档仍偏未来态，和当前 in-memory mock 落地层次不同步
- 现状：架构文档仍大量描述 TS / Prisma / Redis / jobs 等未来结构。
- 影响：短期内不影响演示，但会继续制造“已落地”错觉。
- 建议：加一段“当前实现状态 vs 目标架构”的说明，而不是完全按未来态书写。

### P2-2 仓库仍缺统一环境样例
- 现状：未见根目录 `.env.example`
- 影响：现在问题不大，但前端开始接入后会迅速放大。
- 建议：前后端至少给出端口、API base URL、mock 开关示例。

---

## 5. 证据摘要（本轮实测）

### 已确认通过
- `PORT=3100 npm start` 可启动后端
- `GET /health` 正常
- `POST /api/auth/mock/login` 正常
- `GET /api/auth/me` 正常
- `POST /api/schedules/batches/:id/validate` 正常
- `POST /api/schedules/batches/:id/submit-approval` 正常
- `GET /api/approvals/pending` 正常
- `POST /api/approvals/:id/approve` 正常
- `POST /api/schedules/batches/:id/publish` 正常

### 已确认问题
- 默认端口 `3000` 在当前机器上冲突
- 前端不可启动
- 员工/店长/运营经理接口权限未做后端收口
- mock 用户与测试文档口径不一致

---

## 6. 本轮建议动作（按最小投入排序）

1. **先补 `atlas-web` 最小可运行壳**：哪怕只有登录页、首页、审批列表页，也比继续写页面设计文档更值钱。  
2. **给后端补 RBAC 最小校验**：至少拦住员工发排班、店长审批这类明显越权。  
3. **把 mock 文档改成真实可执行口径**：userId、端口、启动命令、演示顺序全对齐。  
4. **补待开通用户样本**：把 `/pending-access` 从“设计项”变成“可演示项”。  
5. **补根目录 `.env.example` / 启动说明**：降低新环境误判成本。

---

## 7. QA 判定

### 当前判定
**Atlas 当前可判定为“后端 mock MVP 基本可演示”，但尚不能判定为“前后端可演示 MVP”。**

### 触发“可演示 MVP”判定的最低门槛
需同时满足：
- 前端可启动；
- 登录页/首页/员工班表/店长排班/审批页至少有可点击壳；
- 后端继续维持当前 mock 闭环；
- 文档、账号、端口、路由口径统一；
- 越权接口被拦住。
