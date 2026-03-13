# Atlas Backend / Env Owner Preflight Checklist — First Real WeCom Acceptance

> 更新时间：2026-03-13 19:27 GMT+8  
> 用途：在真实凭证到位时，供 Backend / Env Owner 直接勾选并执行，避免从长文里临时拼步骤。  
> 上位文档：
> - `docs/backend-wecom-real-acceptance-handoff-2026-03-13.md`
> - `docs/backend-wecom-real-auth-acceptance.md`

## 1. 当前 repo 侧结论

当前仓库已经具备首轮真实企微验收所需的 backend 基础能力：
- `npm run check:wecom-env`
- `npm run probe:wecom-acceptance`
- `npm run test:auth`
- callback tracing / auth event logs
- `pendingAccess` / `/api/auth/me` / invalid-session / stateless logout 契约

因此，**当前不是后端实现缺功能**，而是**共享验收环境仍未满足真实运行前提**。

## 2. 真实验收前必须到位的外部输入

以下项缺任一项，都不要宣称可做“真实 WeCom acceptance”：

- [ ] `ATLAS_AUTH_TOKEN_SECRET`（非默认 dev secret）
- [ ] `ATLAS_WECOM_AUTH_MODE=real`
- [ ] `WECOM_CORP_ID`
- [ ] `WECOM_AGENT_ID`
- [ ] `WECOM_SECRET`
- [ ] `WECOM_REDIRECT_URI`
- [ ] `ATLAS_WECOM_ALLOW_REDIRECT_OVERRIDE=false`
- [ ] WeCom 应用后台 callback/redirect 配置与 `WECOM_REDIRECT_URI` **完全一致**
- [ ] 目标 callback 环境可从真实 WeCom 登录流程到达
- [ ] 同一套环境同时供 Backend probe 与 QA 验证使用

## 3. 身份准备（必须提前写明）

在执行 probe 前，先填好下面四类身份，不要边跑边猜：

| Label | WeCom identity | Atlas mapping expectation | Expected branch |
|---|---|---|---|
| employee | `<fill>` | active mapped employee | success |
| manager | `<fill>` | active mapped manager | success |
| operation_manager | `<fill>` | active mapped operation manager | success |
| negative | `<fill>` | unmapped or inactive | pendingAccess |

## 4. 执行顺序（只按这个顺序）

### Step A — 环境 readiness

```bash
cd atlas-server
npm run check:wecom-env
```

通过标准：
- `effectiveMode=real`
- `READY_FOR_REAL_AUTH_ENV_CHECK=true`

若失败：立即停下，先修环境，不要进入浏览器或 QA。

### Step B — 后端 acceptance probe

```bash
cd atlas-server
ATLAS_BACKEND_BASE_URL=https://<target-backend-base-url> \
ATLAS_WECOM_SUCCESS_CODE='<real mapped active-user code>' \
ATLAS_WECOM_PENDING_CODE='<real unmapped-or-inactive-user code>' \
npm run probe:wecom-acceptance
```

必须产出：
- [ ] login URL evidence
- [ ] success callback evidence
- [ ] pendingAccess evidence
- [ ] `/api/auth/me` continuity evidence
- [ ] invalid-session evidence
- [ ] logout contract evidence（若 success token 可得）

### Step C — 同批次日志/追踪留档

同一轮执行中必须同时保留：
- [ ] probe 原始 stdout/stderr
- [ ] callback 成功分支时间戳
- [ ] callback pendingAccess 分支时间戳
- [ ] 对应 request tracing / auth-event snippets
- [ ] backend commit hash

## 5. QA handoff 最小包

Backend 交 QA / Tech Lead 时，最少应给出：

- [ ] 环境 URL
- [ ] `check:wecom-env` 输出
- [ ] `probe:wecom-acceptance` 输出
- [ ] 成功身份 label + 结果摘要
- [ ] negative 身份 label + `pendingAccess` 结果摘要
- [ ] `/api/auth/me` 连续性摘要
- [ ] missing/malformed token 的 `401` 结果
- [ ] tracing/log 引用
- [ ] backend commit hash

### 5.1 现场留档模板（建议直接复制到执行记录里）

> 目的：避免执行完才发现少了时间戳、命令行或日志定位信息。下面这些字段都来自当前脚本/流程，不引入新要求。

```md
# WeCom real acceptance evidence

- Run owner:
- Run date/time (GMT+8):
- Backend env URL:
- Backend commit hash:
- Redirect override confirmed off (`ATLAS_WECOM_ALLOW_REDIRECT_OVERRIDE=false`): yes / no

## Identity labels used
- success label:
- success expected Atlas role:
- pendingAccess label:
- pendingAccess expected accessState:

## Step A — check:wecom-env
- Command:
  `cd atlas-server && npm run check:wecom-env`
- Result:
- Evidence snippet:
  - `effectiveMode=`
  - `READY_FOR_REAL_AUTH_ENV_CHECK=`

## Step B — probe:wecom-acceptance
- Command:
  `cd atlas-server && ATLAS_BACKEND_BASE_URL=... ATLAS_WECOM_SUCCESS_CODE='...' ATLAS_WECOM_PENDING_CODE='...' npm run probe:wecom-acceptance`
- Probe log file/path:
- Result:

### Login URL evidence
- HTTP status:
- `mode=`
- `corpId=`
- `agentId=`
- `redirectUri=`
- `state=`

### Success callback evidence
- Timestamp:
- Identity label:
- `loginType=`
- `wecomMode=`
- token issued: yes / no
- mapped Atlas role:

### Session continuity evidence
- First `/api/auth/me` summary:
- Second `/api/auth/me` summary:
- identity stable: yes / no
- role stable: yes / no

### Pending-access evidence
- Timestamp:
- Identity label:
- `pendingAccess=`
- `accessState=`
- token issued: yes / no

### Invalid-session evidence
- missing token status:
- malformed token status:
- logout contract checked: yes / no

## Trace/log references
- callback success trace/log reference:
- callback pending trace/log reference:
- auth-event snippet reference:
```

## 6. 当前阻塞结论（截至 2026-03-13 19:27 GMT+8）

当前默认仓库环境执行结果仍是：
- `configuredMode=auto`
- `effectiveMode=stub`
- `READY_FOR_REAL_AUTH_ENV_CHECK=false`
- 真实所需 secret / corp / agent / redirect 当前均未在共享验收环境证明到位

同时，repo 内 `npm run test:auth` 仍然通过，说明：
- 后端 auth 契约与本地/受控 smoke 覆盖仍正常
- 现阶段主阻塞依旧是**外部环境 readiness**，不是新增 repo 内后端回归

## 7. 交接一句话

**下一步不是继续改 backend，而是由 Env Owner 补齐真实凭证、callback 对齐和测试身份，然后 Backend 在同一环境跑一轮真实 acceptance probe，再交 QA 做 auth-first 验证。**
