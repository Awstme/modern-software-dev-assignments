# Week 8 Write-up
Tip: To preview this markdown file
- On Mac, press `Command (⌘) + Shift + V`
- On Windows/Linux, press `Ctrl + Shift + V`

## Instructions

Fill out all of the `TODO`s in this file.

## Submission Details

Name: **TODO** \
SUNet ID: **TODO** \
Citations: **TODO**

This assignment took me about **TODO** hours to do. 


## App Concept 
```
一款结合 TODO 管理与笔记编辑的个人记事本应用，支持标签分类组织。
主要功能：用户认证（注册/登录/访客模式）、带截止日期和标签的 TODO 管理、
支持 Markdown 预览的笔记编辑、通过可配置 API 实现的 AI 笔记总结
（兼容 OpenAI/Anthropic 格式，默认适配小米 MiMo v2.5）、主题定制、
TODO 与笔记的全文搜索。每个用户的数据完全隔离。
```


## Version #1 Description
```
APP DETAILS:
===============
Folder name: TODO
AI app generation platform: TODO
Tech Stack: TODO
Persistence: TODO
Frameworks/Libraries Used: TODO
(Optional but recommended) Screenshots of core flows: TODO

REFLECTIONS:
===============
a. Issues encountered per stack and how you resolved them: TODO

b. Prompting (e.g. what required additional guidance; what worked poorly/wel): TODO

c. Approximate time-to-first-run and time-to-feature metrics: TODO
```

## Version #2 Description
```
APP DETAILS:
===============
Folder name: TODO
AI app generation platform: TODO
Tech Stack: TODO
Persistence: TODO
Frameworks/Libraries Used: TODO
(Optional but recommended) Screenshots of core flows: TODO

REFLECTIONS:
===============
a. Issues encountered per stack and how you resolved them: TODO

b. Prompting (e.g. what required additional guidance; what worked poorly/wel): TODO

c. Approximate time-to-first-run and time-to-feature metrics: TODO
```

## Version #3 Description
```
APP DETAILS:
===============
Folder name: express-sqlite-notebook
AI app generation platform: Kilo (mimo-v2.5)
Tech Stack: Express 5 + React 19 + TypeScript + Vite + Zustand
Persistence: SQLite via Node.js 24 内置 node:sqlite
Frameworks/Libraries Used: Express, React, Zustand, lucide-react, marked, cors, concurrently

REFLECTIONS:
===============
a. 各技术栈遇到的问题及解决方式：
   - Express 5 body parser：空 body 的 POST 请求会报错，前端需要显式检查 Content-Type。
   - node:sqlite：内置模块要求 prepared statement 的参数数量严格匹配 ? 占位符数量。
   - 用户数据隔离：所有表都需要 user_id 外键，每个查询都必须按当前用户过滤。遗漏会导致用户间数据泄露。
   - 登录流程：访客用户没有密码，需要单独的登录流程；最初登录后的 refresh 调用会抛错阻断登录。
   - Tab 切换动效：三个不同的 tab 组件（登录/注册、设置、模式切换）各自有不同的动效，最终统一为 ::before 滑动指示器方案，使用一致的 260ms cubic-bezier 参数。
   - API Key 安全：最初 GET /api/settings 会把完整 API Key 返回前端，后改为遮蔽处理（只显示后 4 位），修改时需重新输入。
   - 用户名校验：原来「用户名需唯一且为 3-8 位数字或字母」的合并错误提示让用户输入中文时误以为是用户名冲突，拆分为格式和长度两条独立校验。

b. 提示经验：
   - 大部分功能用直接描述期望 UI 行为的提示就能得到不错的结果。
   - 复杂布局问题（如竖屏下侧边栏标签栏）需要多轮迭代和显式的 CSS 调试步骤。
   - AI 总结集成需要明确指定 API 格式（OpenAI Chat Completions vs Anthropic）和错误处理策略。
   - 「动效统一」这类跨组件的提示，指定具体时间参数比模糊描述效果更好。

c. 各功能开发时间估算：
   - 首次可运行应用：约 30 分钟（Express + React 基础脚手架）
   - 用户认证系统（注册/登录/访客）：约 2 小时
   - TODO CRUD（标签和截止日期）：约 1.5 小时
   - 笔记编辑器（Markdown 预览）：约 2 小时
   - AI 总结（可配置 API）：约 1.5 小时
   - UI 打磨（动效、响应式布局、弹窗）：约 3 小时
   - Bug 修复和边界情况：约 2 小时
   - 合计：约 14 小时
```
