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

- **Sprint 1 验收口径**：以 mock MVP 可演示收口为准，不以真实 WeCom 登录交付为阻塞。
- **Sprint 1 剩余 gate**：完成一轮最终 mock E2E / QA retest，并确认审批详情、RBAC、批次状态流在真实联调中稳定。
- **Sprint 2 起点**：进入 WeCom OAuth、用户映射、回调域名配置、持久化与请假/通知集成。
