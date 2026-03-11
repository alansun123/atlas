# Atlas Backend

后端目录：`atlas-server/`

## 技术栈

- Node.js
- Express

## 目录结构

```bash
atlas-server/
├── package.json
├── .gitignore
└── src/
    ├── app.js
    ├── config/
    ├── controllers/
    ├── middlewares/
    ├── routes/
    │   └── health.js
    ├── services/
    ├── utils/
    └── modules/
        ├── auth/
        │   └── index.js
        ├── schedule/
        │   └── index.js
        ├── leave/
        │   └── index.js
        └── approval/
            └── index.js
```

## 启动方式

在 `projects/atlas/atlas-server` 目录下执行：

```bash
npm install
npm run dev
```

生产启动：

```bash
npm install
npm start
```

## 路由说明

- `GET /`：服务欢迎信息
- `GET /health`：健康检查
- `GET /api/auth`：auth 模块占位路由
- `GET /api/schedule`：schedule 模块占位路由
- `GET /api/leave`：leave 模块占位路由
- `GET /api/approval`：approval 模块占位路由
