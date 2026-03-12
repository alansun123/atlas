# Atlas Tech Lead Plan

> 目标：在 Sprint 1 内把 Atlas 拉到“可演示 MVP”状态，并优先减少文档与代码漂移。
> 更新时间：2026-03-12

## 执行计划

1. **冻结 Sprint 1 演示边界为 mock MVP**
   - 以“mock 登录 + mock 排班/审批闭环”为 Sprint 1 演示口径。
   - 真实企微 OAuth、MySQL 落库、请假回调保留接口与文档，但不作为本 Sprint 演示阻塞项。

2. **把 README / Sprint / QA 文档统一到当前仓库事实**
   - 统一仓库地址为 `github.com/alansun123/atlas`。
   - 明确 `atlas-web/` 已创建但尚未达到可运行脚手架状态。
   - 避免再出现“前端缺失”和“前端已可运行”两种相反描述并存。

3. **以前端可运行骨架为 Sprint 1 头号阻塞项**
   - 补齐 `atlas-web/package.json`、Vite 配置、`index.html`、`src/main.*`、基础路由。
   - 最低标准：`npm install`、`npm run dev`、`/login`、`/home` 可访问。

4. **锁定前后端联调合同为现有 mock API**
   - 前端第一轮只对接已存在的后端 mock 路由：`/api/auth`、`/api/stores`、`/api/employees`、`/api/schedules`、`/api/leaves`、`/api/approvals`。
   - 不新增第二套命名，缺口通过补文档或补最小兼容接口解决。

5. **优先打通 4 条演示链路而非平均铺开**
   - 员工：mock 登录 → `/home` → `/employee/schedule`。
   - 店长：mock 登录 → `/manager/schedule` → 创建草稿 → 校验。
   - 审批：提交审批 → `/approvals` → `/approvals/:id` → 通过/驳回。
   - 发布：审批通过后发布排班，员工侧能看到已发布班表。

6. **后端在 Sprint 1 只补“演示刚需缺口”**
   - 保持统一响应结构与复数路由前缀。
   - 若前端联调发现缺字段，优先补 mock data / DTO，不急于引入真实数据库与 ORM。
   - 把 `wework`、`db`、`sync` 标记为 Sprint 2 真集成任务。

7. **建立一份单一事实源的验收清单**
   - 以 `docs/mvp-delivery-checklist.md` 作为演示验收主表。
   - 每补齐一个页面、接口或脚手架，就同步更新清单，避免 README、QA、Sprint 各写各的。

8. **Sprint 1 收口方式：先演示，再切真实集成**
   - 演示前完成一次前后端冒烟：启动、登录、排班、审批、发布。
   - 演示后立即进入 Sprint 2：企微 OAuth 真接入、MySQL schema、请假同步与持久化。
