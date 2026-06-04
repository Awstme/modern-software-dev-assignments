# Express + SQLite Notebook

Week 8 记事本应用，基于 Express + SQLite + React 构建。支持 TODO 管理、笔记编辑、标签筛选、搜索、Markdown 预览、AI 总结等功能。

在线演示：https://notebook.awstme.top/

## 技术栈

- **Frontend**: React 19 + TypeScript + Vite + Zustand + lucide-react
- **Backend**: Express 5
- **Database**: Node.js 24 内置 `node:sqlite`（无需原生 npm 包）
- **Markdown**: marked
- **AI 总结**: 支持 OpenAI Chat Completions / Anthropic API 格式，可自定义接口地址

## 功能特性

- **用户系统**：注册 / 登录 / 访客模式，数据按用户隔离
- **TODO 管理**：创建、编辑、完成、删除，支持标签和截止日期
- **笔记编辑**：富文本编辑、Markdown 预览切换、AI 总结、导出 Markdown
- **标签系统**：创建、删除标签，标签筛选和过滤
- **主题切换**：多套主题颜色可选
- **AI 总结**：支持配置 OpenAI / Anthropic 兼容接口，默认适配小米 MiMo v2.5
- **响应式布局**：支持大屏和小屏（竖屏适配仍在优化中）

## 前置条件

- Node.js 24 或更新版本
- npm

## 安装与运行

```bash
cd week8/express-sqlite-notebook
npm install
npm run build
npm run dev
```

默认地址：

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`

## Docker 部署

生产环境中 Express 同时提供 API 和前端静态文件，只需暴露 `3001` 端口。

```bash
cd week8/express-sqlite-notebook
docker compose up -d --build
```

访问 `http://服务器IP:3001`。SQLite 数据通过绑定挂载 `./data` 持久化到宿主机。

常用命令：

```bash
docker compose logs -f       # 查看日志
docker compose restart       # 重启容器
docker compose down          # 停止并移除容器
docker compose up -d --build # 重新构建并启动
```

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/guest` | 访客登录 |
| PATCH | `/api/users/me` | 修改昵称/头像/密码 |
| GET | `/api/settings` | 获取用户设置 |
| PUT | `/api/settings` | 更新用户设置 |
| GET | `/api/tags` | 获取标签列表 |
| POST | `/api/tags` | 创建标签 |
| DELETE | `/api/tags/:id` | 删除标签 |
| GET | `/api/todos` | 获取 TODO 列表 |
| POST | `/api/todos` | 创建 TODO |
| PATCH | `/api/todos/:id` | 更新 TODO |
| DELETE | `/api/todos/:id` | 删除 TODO |
| GET | `/api/notes` | 获取笔记列表 |
| GET | `/api/notes/:id` | 获取单条笔记 |
| POST | `/api/notes` | 创建笔记 |
| PATCH | `/api/notes/:id` | 更新笔记 |
| DELETE | `/api/notes/:id` | 删除笔记 |
| POST | `/api/notes/:id/summarize` | AI 总结 |

## 环境变量

- `PORT`：后端端口，默认 `3001`

## 已知限制

- 主要适配大屏桌面端，小屏竖屏显示仍存在部分布局问题。
- Markdown 编辑使用 textarea，未接入富文本编辑器。
