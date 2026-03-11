# Atlas 开发团队

## 团队架构

```
┌─────────────────────────────────────┐
│         Product Manager             │
│         Nomi (糯米)                 │
│   项目规划 · 需求管理 · 对外协调     │
└─────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
┌───────────┐ ┌───────────┐ ┌───────────┐
│  Tech     │ │  Frontend │ │  Backend  │
│  Lead     │ │  Dev     │ │  Dev     │
│  Codex    │ │ Claude    │ │  coding  │
│           │ │  Code     │ │  agent   │
└───────────┘ └───────────┘ └───────────┘
```

## 角色职责

| 角色 | Agent | 职责 |
|------|-------|------|
| Product Manager | Nomi | 需求分析、Sprint规划、进度管理 |
| Tech Lead | Codex | 架构设计、技术方案、代码审查 |
| Frontend Dev | Claude Code | Vue3前端开发、组件编写 |
| Backend Dev | 编码Agent | Node.js后端、API开发 |
| DevOps | Nomi | 部署、CI/CD、代码提交 |

## 协作规范

### 1. Sprint 流程

```
Sprint Planning → Daily Standup → Development → Code Review → Test → Deploy → Retrospective
```

### 2. 代码管理

- **主干开发**：`main` 分支
- **功能分支**：`feature/功能名`
- **提交规范**：`[type] description`（feat/fix/docs）

### 3. 每日站会

- 每人汇报：昨天完成 / 今天计划 / 阻塞问题

### 4. Definition of Done

- [ ] 代码编写完成
- [ ] 通过 Code Review
- [ ] 本地测试通过
- [ ] 提交到 GitHub

---

## 沟通方式

- 所有讨论在当前会话进行
- 重要决策同步到 `projects/atlas/docs/decisions/`
- 遇到阻塞立即升级给 PM

---

*团队组建完成，准备开工*
