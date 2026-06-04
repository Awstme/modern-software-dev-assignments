# Express + SQLite Notebook

这是 Week 8 记事本应用的 Express + SQLite 版本。应用包含 TODO 管理、文本笔记、标签筛选、搜索、笔记编辑、删除和本地 AI 总结占位接口。

## 技术栈

- Frontend: React + TypeScript + Vite + Zustand + lucide-react
- Backend: Express
- Persistence: SQLite via Node.js built-in `node:sqlite`
- Database file: `backend/data/notebook.sqlite`

## 前置条件

- Node.js 24 或更新版本
- npm

本版本使用 Node.js 内置 `node:sqlite`，不需要安装 SQLite 原生 npm 包。

## 安装

```bash
cd week8/express-sqlite-notebook
npm install
```

依赖会安装到本项目目录的 `node_modules/`，不需要全局安装。

## 运行

```bash
npm run dev
```

默认地址：

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`

## Docker 部署

本项目提供 `Dockerfile` 和 `docker-compose.yml`。生产环境中 Express 会同时提供 API 和 `dist/` 前端静态文件，默认只需要暴露 `3001` 端口。

```bash
cd week8/express-sqlite-notebook
docker compose up -d --build
```

访问地址：

- `http://服务器IP:3001`

SQLite 数据通过 Docker volume 持久化到 `notebook-data`，容器重建不会丢失数据。

常用命令：

```bash
docker compose logs -f
docker compose restart
docker compose down
```

如果要删除数据库并重新生成演示数据：

```bash
docker compose down -v
docker compose up -d --build
```

## API

- `GET /api/tags`
- `POST /api/tags`
- `GET /api/todos`
- `POST /api/todos`
- `PATCH /api/todos/:id`
- `DELETE /api/todos/:id`
- `GET /api/notes`
- `POST /api/notes`
- `GET /api/notes/:id`
- `PATCH /api/notes/:id`
- `DELETE /api/notes/:id`
- `POST /api/notes/:id/summarize`

## 环境变量

- `PORT`: 后端端口，默认 `3001`

当前 AI 总结接口使用本地摘要逻辑，便于课程演示时无 API Key 也能运行。如果要接入真实模型，可以在 `backend/server.js` 的 `/api/notes/:id/summarize` 中替换为 OpenAI API 调用。

## 已知限制

- 没有用户登录，所有数据保存在本地 SQLite 文件。
- Markdown 内容目前使用 textarea 编辑，没有接入富文本编辑器。
- AI 总结为本地演示逻辑，不调用外部服务。

## 手动修复记录

- 为避免原生 SQLite npm 包在不同机器上编译失败，本版本使用 Node.js 24 的内置 `node:sqlite`。
- 前端通过 Vite proxy 访问 Express API，避免开发时跨域配置复杂化。
