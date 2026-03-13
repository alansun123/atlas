# WeCom Integration Plan

> Sprint 2 对齐文档（已按 2026-03-12 source-of-truth 收敛）  
> 更新时间：2026-03-13 15:30 GMT+8  
> 权威 planning 文档：`docs/tech-lead-sprint2-source-of-truth-2026-03-12.md`

---

## 1. Current repo truth

### 已落地 / 不应再当作当前实施待办
- **Sprint 1 mock MVP**：已完成并通过回归
- **approval-detail / RBAC / state-machine hardening**：已完成，实现范围关闭；后续仅保留回归验证
- **frontend real-auth-first skeleton**：已落地，登录入口与 callback 路径已按真实认证优先组织
- **backend auth contract / probe support**：已落地，可做环境检查与 acceptance probe
- **最新相关实现补充**：`382d4a8 feat(atlas-server): add auth request tracing logs` 已补充认证请求 tracing，便于后续真实环境验收取证

### 当前真正的 P0 阻塞
真实 WeCom 验收仍被以下外部条件阻塞：
- 缺少真实 `WECOM_CORP_ID / WECOM_AGENT_ID / WECOM_SECRET`
- 缺少确认后的 callback / redirect 环境
- 缺少已映射的真实测试身份（employee / manager / ops manager）
- 缺少一个用于 `pendingAccess` 的未映射或禁用身份

> 结论：当前不是“继续补写 OAuth 基础实现”，而是“等待真实环境输入后完成一次证据化验收”。

---

## 2. Acceptance boundary

### 2.1 真实 WeCom 验收完成的定义
只有在真实环境里同时满足以下条件，Sprint 2 real-auth acceptance 才能关闭：
1. 用户可从 WeCom 登录入口完成 callback
2. callback 对已映射用户返回有效登录态，对未映射/禁用用户返回 `pendingAccess` 或拒绝分支
3. `GET /api/auth/me` 与 callback 身份结果一致，且刷新后连续一致
4. 无效/过期会话不会伪装成登录成功
5. employee / manager / ops manager 三类真实身份完成验证
6. callback 域名、应用配置、redirect URI 与真实租户一致
7. 证据按 `docs/backend-wecom-real-auth-acceptance.md` 记录完成

### 2.2 不应再使用的陈旧表述
以下说法当前都不准确：
- “Sprint 1 还没收尾”
- “approval-detail / RBAC / state-machine 仍是活跃 P0 开发项”
- “backend callback 还只是 placeholder”
- “frontend auth 还只是 mock-first 脚手架”
- “要先完成更大范围持久化，才能开始 auth acceptance”

---

## 3. What is executable now

### 现在就能做（无需凭证）
- **Tech Lead**：保持 planning/status 文档与 source-of-truth 一致
- **Backend**：维持 auth contract、probe、取证能力稳定；真实环境到位后执行验收
- **QA**：保留 auth-first 验收顺序与回归包，不把 mock/fallback 页面当成真实验收证据
- **回归范围**：仅做 regression-only follow-up，不重开 Sprint 1 已关闭实现范围

### 现在不该做
- 不要把 approval-detail / RBAC / state-machine 重新包装成活跃实现 bug
- 不要因文档或 watchdog 维护性提交而重复拉起 Frontend / Backend / QA worker
- 不要把 redirect override 路径当作共享环境验收默认路径；当前基线默认 **OFF**，仅限显式本地 smoke 使用

---

## 4. Real-env execution order

真实环境输入到位后，执行顺序应固定为：
1. 确认真实 secrets、callback 域名、redirect URI
2. Backend 运行 `npm run check:wecom-env`
3. Backend 运行 `npm run probe:wecom-acceptance`，并结合 `382d4a8` 后的 tracing 日志保留证据
4. QA 按 auth-first 顺序验证 success / `pendingAccess` / `/api/auth/me` / invalid-session
5. QA 对 approval-detail / RBAC / state-machine 做小范围回归验证
6. Tech Lead 基于同一轮证据给出最终 acceptance verdict

> 执行细化与证据打包格式，统一以 `docs/backend-wecom-real-acceptance-handoff-2026-03-13.md` 为准，避免真实环境到位后再次临时拼装执行步骤。

---

## 5. Short owner map

- **Tech Lead**：规划真相、执行顺序、文档对齐
- **Backend**：真实认证落地执行与证据输出
- **QA**：auth-first 验证与回归结论
- **Frontend**：除非出现新的失败回归，否则当前不应因本计划单独重开执行

---

## 6. Document precedence

如与以下文档存在冲突，以 `docs/tech-lead-sprint2-source-of-truth-2026-03-12.md` 为准：
- 本文档
- `docs/watchdog-status-next-steps-2026-03-12.md`
- 其他简版状态镜像

---

*本文件保留为 Sprint 2 WeCom 集成总览，但不再作为逐项未完成实施清单使用。*