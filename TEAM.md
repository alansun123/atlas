# Atlas 开发团队

> 更新：2026-03-11

## 团队架构

```
                    ┌─────────────────┐
                    │  Product Owner  │
                    │     Nomi        │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  Tech Lead    │   │  Frontend    │   │  Backend     │
│  codex        │   │  claude-code  │   │  coding-agent │
└───────────────────┘   └───────────────┘
       ───┘   └──────── │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                             ▼
                    ┌───────────────┐
                    │      QA       │
                    │   test-agent  │
                    └───────────────┘
```

## 角色职责

| 角色 | Agent ID | 职责 |
|------|----------|------|
| Product Owner | Nomi (主会话) | 需求管理、Sprint规划、进度汇报 |
| Tech Lead | codex（Colter） | 架构设计、技术方案、代码审查 |
| Frontend Dev | claude-code（Cock） | Vue3前端开发、组件编写 |
| Backend Dev | coding-agent（Peter） | Node.js后端、API开发 |
| QA | test-agent（Andy） | 测试、Bug查找 |

## 协作规范

### Sprint 流程
```
Sprint Planning → 每日站会 → 开发 → Code Review → 测试 → 部署 → 回顾
```

### 代码管理
- 主干：`main` 分支
- 功能分支：`feature/功能名`
- 提交规范：`[feat/fix/docs] description`

### 每日站会格式
```
[日期] Sprint X Day Y

✅ 昨天完成：
- [任务]

📋 今天计划：
- [任务]

🚧 阻塞问题：
- [无/问题描述]
```

### Definition of Done
- [ ] 代码完成
- [ ] Code Review 通过
- [ ] QA 测试通过
- [ ] 提交到 GitHub

---

*Atlas团队 v1.0*
