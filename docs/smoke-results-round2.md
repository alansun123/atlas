# Atlas Smoke Results（Round 2）

> 日期：2026-03-12  
> 范围：基于当前仓库现状做 mock 联调 smoke；不假设真实企微接入

## 1. 结论总览

这轮 smoke 的结论比上一版文档更清楚：

- **后端 mock API：能跑，主链路大体可通**
- **前端工程：现在已经能跑、也能 build，但主要还是本地 mock 展示，不是真联后端**
- **联调现状：属于“前后端并存，但还没真正接上”**
- **主要阻塞：后端权限未收口、审批/发布状态机有漏洞、前端数据源仍是静态 mock**

## 2. 本轮实际验证环境

### 后端
- 实测可访问：`http://127.0.0.1:3100`
- `GET /health` 返回正常
- 注意：仓库默认 `npm start` 仍走 `3000`，本机该端口已被其它服务占用，直接启动会 `EADDRINUSE`

### 前端
- 实测可运行：`atlas-web/`
- `npm run dev -- --host 127.0.0.1 --port 4173` 可启动
- `npm run build` 通过
- 浏览器已验证 `/login`、`/manager/schedule` 页面可打开

---

## 3. 真通了的链路

### 3.1 后端基础能力

#### PASS-BE-01 健康检查
```bash
curl http://127.0.0.1:3100/health
```
结果：**通过**  
返回 `code=0`，`data.status=ok`

#### PASS-BE-02 Mock 登录
```bash
curl -X POST http://127.0.0.1:3100/api/auth/mock/login \
  -H 'Content-Type: application/json' \
  -d '{"userId":101}'
```
结果：**通过**  
返回 `accessToken=101`，用户角色为 `manager`

#### PASS-BE-03 获取当前用户
```bash
curl http://127.0.0.1:3100/api/auth/me \
  -H 'Authorization: Bearer 101'
```
结果：**通过**

#### PASS-BE-04 未登录拦截
```bash
curl http://127.0.0.1:3100/api/auth/me
```
结果：**通过**  
返回 `code=2001`

### 3.2 后端排班/审批主链路

#### PASS-BE-05 校验排班批次
```bash
curl -X POST http://127.0.0.1:3100/api/schedules/batches/10001/validate \
  -H 'Authorization: Bearer 101'
```
结果：**通过**  
返回 `passed=false`，含 `UNDER_MIN_STAFF`

#### PASS-BE-06 提交审批
```bash
curl -X POST http://127.0.0.1:3100/api/schedules/batches/10001/submit-approval \
  -H 'Authorization: Bearer 101' \
  -H 'Content-Type: application/json' \
  -d '{"triggerReasons":["UNDER_MIN_STAFF","NEW_EMPLOYEE_FIRST_WEEK"],"comment":"QA smoke round2"}'
```
结果：**通过**  
实测返回 `approvalId=90004`，状态 `pending_approval`

#### PASS-BE-07 运营经理查看待审批
```bash
curl http://127.0.0.1:3100/api/approvals/pending \
  -H 'Authorization: Bearer 201'
```
结果：**通过**  
待审批列表中能看到刚提交记录

#### PASS-BE-08 员工查询我的班表
```bash
curl http://127.0.0.1:3100/api/schedules/me \
  -H 'Authorization: Bearer 102'
```
结果：**通过**  
当前返回员工 `102` 的班表列表；本轮实测返回项状态为 `published`

### 3.3 前端可运行性

#### PASS-FE-01 前端安装产物齐全
- `atlas-web/package.json` 存在
- `src/main.ts`、`src/router/index.ts`、views 均存在

结果：**通过**

#### PASS-FE-02 前端 dev 可启动
```bash
cd atlas-web
npm run dev -- --host 127.0.0.1 --port 4173
```
结果：**通过**

#### PASS-FE-03 前端 build 可通过
```bash
cd atlas-web
npm run build
```
结果：**通过**

#### PASS-FE-04 页面壳可访问
浏览器实测：
- `/login`
- `/manager/schedule`

结果：**通过**

---

## 4. 还是假按钮 / 假数据 / 假联调的部分

### MOCK-FE-01 登录仍是纯前端 session mock
前端 `src/stores/session.ts` 的 `loginAs()` 直接写入 localStorage：
- `mock-employee-token`
- `mock-manager-token`
- `mock-operation-token`

`LoginView.vue` 也是“以员工/店长/运营经理身份进入”三个本地按钮。

结论：**前端登录不走后端 `/api/auth/mock/login`，只是本地假登录。**

### MOCK-FE-02 首页/排班/审批数据仍来自 `src/api/mock.ts`
前端 `fetchHomeData()`、`fetchEmployeeSchedule()`、`fetchManagerSchedule()`、`fetchApprovals()`、`fetchApprovalDetail()` 都是本地写死数据。

结论：**前端页面虽然能打开，但当前看到的是静态 mock 数据，不是后端真实返回。**

### MOCK-FE-03 店长页按钮当前更像演示按钮
浏览器可见按钮：
- 保存草稿
- 校验排班
- 提交审批
- 发布排班

但结合代码结构与数据源判断，这批交互目前仍主要服务于页面演示，不是完整联后端闭环。

结论：**页面可看，但不能当成“已联通真实 API”的证据。**

---

## 5. 失败项 / 阻塞项

### FAIL-BE-01 默认启动端口与本机环境冲突
```bash
cd atlas-server
npm start
```
结果：**失败**  
报错：`EADDRINUSE: address already in use :::3000`

说明：
- 代码本身不是完全起不来
- 但 README/默认命令的可执行性不稳
- 当前机器上需要显式改端口，例如 `PORT=3100 npm start`

### FAIL-BE-02 按文档固定 approvalId 做审批不可复现
旧 checklist 用 `<approvalId>` 占位，但当前内存库是运行态数据，approvalId 会递增。

本轮第一次直接打：
```bash
POST /api/approvals/90001/approve
```
结果：**失败**，返回“审批单不存在”

说明：
- checklist 里需要强调“先取实时 approvalId，再 approve”
- 当前服务是 in-memory mock，不适合写死动态 id

### BLOCK-FE-01 前端尚未真正接后端
虽然前端已能启动，但当前阻塞已经从“工程不可运行”变成了：

- **工程能跑**
- **但联调未完成**

这不是“前端失败”，而是“前端仍处于静态演示阶段”。

---

## 6. 高风险问题（本轮最值得盯）

### RISK-01 员工可创建排班批次
```bash
curl -X POST http://127.0.0.1:3100/api/schedules/batches \
  -H 'Authorization: Bearer 102' \
  -H 'Content-Type: application/json' \
  -d '{"storeId":1,"weekStartDate":"2026-03-30","weekEndDate":"2026-04-05","entries":[]}'
```
结果：**实际成功**，返回新 `batchId=10005`

结论：**后端未拦员工创建排班。**

### RISK-02 员工可直接发布排班
```bash
curl -X POST http://127.0.0.1:3100/api/schedules/batches/10005/publish \
  -H 'Authorization: Bearer 102' \
  -H 'Content-Type: application/json' \
  -d '{"notifyEmployees":false}'
```
结果：**实际成功**，状态 `published`

结论：**后端未拦员工发布排班。**

### RISK-03 店长可直接审批
```bash
curl -X POST http://127.0.0.1:3100/api/approvals/90004/approve \
  -H 'Authorization: Bearer 101' \
  -H 'Content-Type: application/json' \
  -d '{"comment":"role bypass smoke"}'
```
结果：**实际成功**，状态 `approved`

结论：**后端未拦店长审批。**

### RISK-04 已发布批次仍可再次提交审批，状态机不严谨
对刚被员工发布成功的批次 `10005` 再执行：
```bash
curl -X POST http://127.0.0.1:3100/api/schedules/batches/10005/submit-approval \
  -H 'Authorization: Bearer 102' \
  -H 'Content-Type: application/json' \
  -d '{"triggerReasons":["UNDER_MIN_STAFF"],"comment":"employee submit smoke"}'
```
结果：**实际成功**，返回新的 `approvalId=90005`，状态变成 `pending_approval`

结论：
- **状态机存在漏洞**
- 已 `published` 的批次不应再进入待审批

### RISK-05 前端与后端口径不一致
- 后端真实角色：`manager` / `employee` / `operation_manager`
- 前端 mock 角色：`manager` / `employee` / `operation`
- 后端真实门店/人员/审批数据与前端静态文案也不一致

结论：**现在能演示 UI，但不能说“前后端口径统一”。**

---

## 7. 最终判定

### 真通了
- 后端健康检查
- 后端 mock 登录
- 后端获取当前用户
- 后端排班校验
- 后端提交审批
- 后端待审批列表查询
- 前端工程启动
- 前端页面访问
- 前端 production build

### 还是假按钮 / 假数据
- 前端登录
- 前端首页数据
- 前端员工班表页数据
- 前端店长排班页数据
- 前端审批列表/详情数据
- 页面上的保存/校验/提交/发布按钮所代表的联调状态

### 阻塞 / 失败
- 后端默认端口 3000 在当前机器上冲突
- smoke 文档若写死 approvalId/batchId，不适合当前 in-memory mock 实现
- 前端虽可跑，但尚未真正接后端

---

## 8. 建议下一步（按优先级）

1. **先补后端 RBAC**：至少拦住员工创建/发布排班、店长审批。  
2. **修批次状态机**：已 `published` 的批次不能再提交审批。  
3. **前端接第一批真实接口**：至少先接 `/api/auth/mock/login`、`/api/auth/me`、`/api/approvals/pending`。  
4. **更新 smoke checklist**：把动态 id 获取方式写进去，不要再写死。  
5. **补端口说明**：README 或 checklist 明确建议使用 `PORT=3100`。  

---

## 9. QA 一句话结论

**Atlas 当前已经不是“前端空壳 + 后端占位符”了；后端 mock 主链路可跑，前端工程也能跑。但前端仍主要是假数据展示，真正阻塞点已经收敛为：后端权限/状态机漏洞，以及前端尚未接上真实 API。**
