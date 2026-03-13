# Atlas - 智能排班系统

> 项目经理：Nomi（糯米）
> 创建时间：2026-03-11

## 团队成员

| 角色 | 子Agent | 职责 |
|-----|--------|------|
| 技术负责人 | Codex | 架构设计、代码审查 |
| 前端开发 | Claude Code | Vue3前端开发 |
| 后端开发 | 编码Agent | Node.js后端开发 |
| DevOps | - | 部署、CI/CD |

## 冲刺周期（Sprint）

| Sprint | 周期 | 目标 |
|--------|------|------|
| Sprint 1 | Week 1 | Mock MVP 演示闭环（mock 登录 / 排班 / 审批 / 发布） |
| Sprint 2 | Week 2 | WeCom OAuth 接入 + 数据持久化 + 排班基础功能 |
| Sprint 3 | Week 3 | 请假同步 + 人数校验 |
| Sprint 4 | Week 4 | 审批流 + 测试上线 |

## 仓库

- GitHub: github.com/alansun123/atlas

## 技术栈

- 前端：Vue3 + Vant
- 后端：Node.js + Express
- 数据库：MySQL
- 部署：Ubuntu VPS

---

*项目启动*


## 当前 Sprint 口径

- **Sprint 1 状态**：已按 mock MVP 可演示口径完成收口；Sprint 1 closure 保持关闭，不因后续 WeCom 联调重新打开。
- **非当前实现范围**：approval-detail / RBAC / 批次状态流当前仅保留“真实认证切换后的回归验证”属性；若无新的失败回归，不作为活跃实现范围。
- **Sprint 2 当前主阻塞**：真实 WeCom 环境验收仍受限于凭证、回调/域名环境与测试身份映射。
- **Sprint 2 当前起点**：进入 WeCom OAuth、用户映射、回调域名配置与基础持久化；其中 redirect override 现默认关闭，仅允许在明确的本地 smoke test 中临时启用，不能作为共享环境验收路径。
