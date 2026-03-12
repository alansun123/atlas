# Atlas QA Findings - Round 1

> 日期：2026-03-11  
> 角色：QA / Andy  
> 范围：当前仓库中的 README、Sprint 文档、架构/API/数据库/前端页面文档，以及 `atlas-server` 代码骨架。

---

## 1. 结论概览

当前 Atlas 仓库已经有较完整的文档草案与后端基础骨架，但**文档口径与代码现状存在明显偏差**。最大的风险不是“功能有 bug”，而是：

1. 文档描述的是一个更完整的 MVP；
2. 代码当前只到后端占位骨架；
3. 前端工程目录已创建，但尚未达到可运行脚手架状态；
4. Sprint 1 验收项中多项还不具备实际验证条件。

因此，本轮 QA 判断：

**当前仓库状态更接近“设计完成 + 后端初始化完成”，尚不能判定为“MVP 可联调”或“Sprint 1 可完整验收”。**

---

## 2. 发现的问题清单

## F-001 前端工程目录已创建，但多份文档把其描述为“已可运行脚手架”
**级别**：P0  
**现象**：
- `README.md` 的 Sprint 规划写明前端脚手架输出为 `atlas-web/`。
- `docs/frontend-pages.md` 多次引用“当前 `atlas-web` 脚手架”。
- 实际仓库 `projects/atlas/` 下已存在 `atlas-web/` 目录，但当前仅包含 `public/` 与 `src/` 空骨架，未见 `package.json`、Vite 配置等可运行脚手架文件。

**影响**：
- 无法验证前端启动、页面路由、mock 登录、员工班表、店长排班、审批页。
- `docs/test-plan-sprint1.md` 中前端相关验收项当前无法落地执行。

**建议**：
- 先补齐 `atlas-web/` 最小可运行工程（至少 `package.json`、Vite 配置、入口文件），再谈页面和联调。
- 在 README / Sprint / QA 文档中统一表述为“前端目录已创建，但脚手架未完成”，不要写成“目录缺失”或“已可运行”。

---

## F-002 README 中仓库地址与 Sprint 文档不一致
**级别**：P1  
**现象**：
- `README.md` 写的是 `github.com/alansun123/scheduling-system`
- `SPRINT1.md` Task 1.1 的输出写的是 `github.com/alansun123/atlas`

**影响**：
- 交付对象不明确，影响 QA、开发、后续 CI/部署引用。

**建议**：
- 统一正式仓库名与地址，只保留一个口径。

---

## F-003 文档大量引用 `docs/智能排班系统PRD.md`，但仓库内不存在该文件
**级别**：P0  
**现象**：
以下文档均引用 `docs/智能排班系统PRD.md`：
- `docs/database.md`
- `docs/test-plan-sprint1.md`
- 其他文档也存在类似表述

但当前 `projects/atlas/docs/` 下实际文件为：
- `api.md`
- `architecture.md`
- `database.md`
- `frontend-pages.md`
- `test-plan-sprint1.md`

不存在 `智能排班系统PRD.md`。

**影响**：
- 文档追溯链断裂，PRD 作为上游依据无法核对。
- QA 无法验证某些业务规则是否真的来源于 PRD。

**建议**：
- 补 PRD 文件到仓库，或把引用改成实际存在的上游文档。

---

## F-004 架构文档与后端实际技术栈不一致
**级别**：P0  
**现象**：
`docs/architecture.md` 建议：
- Node.js 20 + Express + TypeScript
- Prisma / Redis / tests / server.ts / app.ts 等结构

实际 `atlas-server/`：
- 为 Node.js + Express + JavaScript
- 入口为 `src/app.js`
- 无 TypeScript 配置
- 无 Prisma
- 无 Redis
- 无 tests 目录内容

**影响**：
- 开发人员会按文档预期寻找 TS / Prisma 结构，但仓库并未采用。
- API、数据库、后续实现约束容易继续漂移。

**建议**：
- 二选一：
  1. 代码按文档升级到 TS 架构；
  2. 文档回调为当前 JS 骨架的真实状态，并把 TS 作为后续规划。

---

## F-005 API 文档采用复数 REST 风格，但代码当前为单数占位路由
**级别**：P0  
**现象**：
`docs/api.md` 定义：
- `/api/schedules`
- `/api/leaves`
- `/api/approvals`

实际 `atlas-server/src/app.js` 挂载为：
- `/api/schedule`
- `/api/leave`
- `/api/approval`

且模块内部仅有 `GET /` 占位响应。

**影响**：
- 前后端无法按文档直接联调。
- 测试用例无法基于当前代码执行。

**建议**：
- 尽快统一路由前缀；推荐按 API 文档改成复数资源名。

---

## F-006 Auth 模块文档写的是企微登录闭环，代码中并未实现
**级别**：P0  
**现象**：
`docs/api.md` 与 `SPRINT1.md` 都把企微登录作为 Sprint 1 核心目标。  
实际 `atlas-server/src/modules/auth/index.js` 仅返回：
- `Auth module placeholder`

没有：
- `POST /api/auth/wework/callback`
- `GET /api/auth/me`
- 登录态建立逻辑
- mock 登录兜底方案

**影响**：
- Sprint 1 的“企微登录流程跑通”无法验收。
- 如果企微配置尚未就绪，也没有 mock 登录可支持前端开发。

**建议**：
- 先明确本阶段验收是真实企微还是 mock 登录。
- 若真实企微短期不能落地，优先补一个 `mock-login` 保证业务开发继续进行。

---

## F-007 排班 / 请假 / 审批模块当前仅为占位实现
**级别**：P0  
**现象**：
以下模块目前都只有 placeholder：
- `src/modules/schedule/index.js`
- `src/modules/leave/index.js`
- `src/modules/approval/index.js`

**影响**：
- 文档中的接口、状态机、规则校验、审批流都尚未进入代码。
- Sprint 1 文档虽然写了大量设计，但实际可测试对象非常有限。

**建议**：
- 以 mock 数据先补最小接口：
  - 创建排班批次
  - 校验排班
  - 查询个人班表
  - 查询待审批
  - 审批通过 / 驳回

---

## F-008 测试计划与仓库现状不匹配，验收项过于超前
**级别**：P1  
**现象**：
`docs/test-plan-sprint1.md` 包含：
- 前端启动验收
- 后端健康检查
- 企微 OAuth 登录真实跑通
- GitHub 仓库访问

但当前仓库内：
- 前端目录缺失
- 真实企微接口未落地
- 只能验证后端健康检查与文档完整性的一部分

**影响**：
- 测试计划可读，但不可执行比例高。
- QA 结果会长期停留在“阻塞”，无法形成有效反馈闭环。

**建议**：
- 补一版“当前阶段 mock 验收计划”或在现有测试计划中标出：已具备 / 待补 / 阻塞。

---

## F-009 前端页面文档基于不存在的脚手架做映射说明
**级别**：P1  
**现象**：
`docs/frontend-pages.md` 中写到：
- 当前 `atlas-web` 只有 `HomeView.vue / LoginView.vue / ScheduleView.vue`
- 并给出后续拆分建议

但当前仓库实际没有 `atlas-web`，因此这些“当前已有页面”的描述不成立。

**影响**：
- 容易让协作者误判当前前端已完成到什么程度。

**建议**：
- 改成“目标页面结构建议”，不要写成“当前已有骨架”。

---

## F-010 数据库文档较完整，但当前仓库未见任何真实数据库实现或迁移文件
**级别**：P1  
**现象**：
`docs/database.md` 已给出较完整表设计。  
实际仓库没有：
- Prisma schema
- Sequelize model
- SQL migration
- `.env.example`
- 数据库连接配置示例

**影响**：
- 数据库文档无法被直接验证是否已进入开发实现。
- Sprint 后续若直接开做 API，模型字段容易再次漂移。

**建议**：
- 至少补一个最小落地物：
  - SQL 建表脚本，或
  - ORM schema，或
  - mock 数据结构定义文件

---

## F-011 文档默认存在员工 / 门店 /班次 / 审批等 mock 数据，但仓库内未见统一样例源
**级别**：P1  
**现象**：
多份文档都默认：
- 有角色数据
- 有门店数据
- 有班次模板
- 有排班批次
- 有审批记录

但当前仓库未见：
- `mock/` 目录
- seed 文件
- 示例 JSON

**影响**：
- 即使前端开始做页面，也缺少统一 mock 数据口径。
- 各页面可能各自编造状态和值，后续联调成本变高。

**建议**：
- 新增统一 mock 数据文件，至少覆盖用户、门店、班次、班表、审批单。

---

## F-012 当前唯一可验证的后端能力仅为健康检查和占位路由
**级别**：P2  
**现象**：
目前能直接确认的后端功能：
- 服务能启动（从代码结构看具备基本条件）
- `/health` 存在
- 根路径 `/` 存在
- 4 个业务模块有占位路由

**影响**：
- 项目仍处于“可启动骨架”而非“可联调功能”阶段。

**建议**：
- 里程碑命名应准确，避免把“骨架完成”误写成“模块完成”。

---

## 3. 优先级排序建议

### 3.1 先修 P0
1. 补前端工程或明确前端未提交状态
2. 统一 PRD 路径问题
3. 统一 API 路由命名
4. 明确登录阶段策略：真实企微 or mock
5. 给后端补最小 mock 接口，结束 placeholder 状态

### 3.2 再修 P1
1. 统一仓库名与 README
2. 修正文档中“当前已存在前端骨架”的表述
3. 增补 mock 数据源
4. 增补数据库落地物或 schema
5. 把测试计划改成可执行版本

---

## 4. QA 建议的下一步动作

### 建议路线 A：先做 mock 可演示版
适合当前状态，投入最小。

- 补 `atlas-web/`
- 补 mock 登录
- 补员工班表 / 店长排班 / 审批页
- 后端返回 mock JSON
- 先通过最小测试用例

### 建议路线 B：直接切真实企微 + 数据库
适合环境已就绪、开发资源充足的情况。

- 先补 `.env.example`
- 接入真实 auth callback
- 确认数据库方案并建表
- 再推进页面联调

> 结合当前仓库成熟度，QA 更建议先走路线 A，否则 Sprint 1 很容易继续停留在文档阶段。

---

## 5. 本轮 QA 结论

本轮最大的价值不是发现具体代码 bug，而是确认了一个事实：

**Atlas 当前的主要问题是“文档领先于实现”，且前端、API、PRD 引用存在明显断层。**

如果马上进入真实联调，风险很高；
如果先补 mock 闭环并统一口径，项目会稳很多。
