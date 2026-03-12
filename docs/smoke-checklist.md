# Atlas Smoke Checklist（Round 2）

> 适用范围：当前仓库真实可执行能力  
> 更新：2026-03-12

## 0. 执行前说明

- 前端当前无可运行工程，本清单以后端 smoke 为主。
- 建议端口使用 `3100`，避免本机 `3000` 冲突。

## 1. 启动

```bash
cd atlas-server
PORT=3100 npm start
```

预期：控制台输出 `Atlas server listening on port 3100`

---

## 2. 基础可用性

### SMK-BE-01 健康检查
```bash
curl http://127.0.0.1:3100/health
```
预期：`code=0`，`data.status=ok`

### SMK-BE-02 Mock 店长登录
```bash
curl -X POST http://127.0.0.1:3100/api/auth/mock/login \
  -H 'Content-Type: application/json' \
  -d '{"userId":101}'
```
预期：返回 token `101`

### SMK-BE-03 获取当前用户
```bash
curl http://127.0.0.1:3100/api/auth/me \
  -H 'Authorization: Bearer 101'
```
预期：返回角色 `manager`

---

## 3. 排班与审批闭环

### SMK-BE-04 校验现有排班批次
```bash
curl -X POST http://127.0.0.1:3100/api/schedules/batches/10001/validate \
  -H 'Authorization: Bearer 101'
```
预期：返回 `passed=false`，含 issue

### SMK-BE-05 提交审批
```bash
curl -X POST http://127.0.0.1:3100/api/schedules/batches/10001/submit-approval \
  -H 'Authorization: Bearer 101' \
  -H 'Content-Type: application/json' \
  -d '{"triggerReasons":["UNDER_MIN_STAFF","NEW_EMPLOYEE_FIRST_WEEK"],"comment":"QA smoke"}'
```
预期：返回 `approvalId`

### SMK-BE-06 运营经理查看待审批
```bash
curl http://127.0.0.1:3100/api/approvals/pending \
  -H 'Authorization: Bearer 201'
```
预期：列表中有待审批记录

### SMK-BE-07 审批通过
```bash
curl -X POST http://127.0.0.1:3100/api/approvals/<approvalId>/approve \
  -H 'Authorization: Bearer 201' \
  -H 'Content-Type: application/json' \
  -d '{"comment":"approved in smoke"}'
```
预期：状态 `approved`

### SMK-BE-08 发布排班
```bash
curl -X POST http://127.0.0.1:3100/api/schedules/batches/10001/publish \
  -H 'Authorization: Bearer 101' \
  -H 'Content-Type: application/json' \
  -d '{"notifyEmployees":false}'
```
预期：状态 `published`

---

## 4. 反向检查（当前已知风险）

### SMK-RISK-01 未登录拦截
```bash
curl http://127.0.0.1:3100/api/auth/me
```
预期：返回 `2001`

### SMK-RISK-02 越权检查：员工不应能发布排班
> 当前代码实测 **未拦截**，这是已知问题。

```bash
curl -X POST http://127.0.0.1:3100/api/schedules/batches \
  -H 'Authorization: Bearer 102' \
  -H 'Content-Type: application/json' \
  -d '{"storeId":1,"weekStartDate":"2026-03-23","weekEndDate":"2026-03-29","entries":[]}'
```

再执行：
```bash
curl -X POST http://127.0.0.1:3100/api/schedules/batches/<batchId>/publish \
  -H 'Authorization: Bearer 102' \
  -H 'Content-Type: application/json' \
  -d '{"notifyEmployees":false}'
```

当前现状：会成功。  
目标预期：应返回无权限错误。

### SMK-RISK-03 越权检查：店长不应能审批
> 当前代码实测 **未拦截**，这是已知问题。

```bash
curl -X POST http://127.0.0.1:3100/api/approvals/<approvalId>/approve \
  -H 'Authorization: Bearer 101' \
  -H 'Content-Type: application/json' \
  -d '{"comment":"role bypass"}'
```

当前现状：会成功。  
目标预期：应返回无权限错误。

---

## 5. 前端状态

### SMK-FE-01 前端安装
- 当前阻塞：`atlas-web/` 无 `package.json`

### SMK-FE-02 前端启动
- 当前阻塞：无 Vite/入口文件

### SMK-FE-03 页面访问
- 当前阻塞：无可运行页面
