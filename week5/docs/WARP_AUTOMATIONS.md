# Week 5 Warp 自动化

本文档记录 Week 5 项目中使用的 Warp 自动化设计，包括 Warp Drive saved prompt、
多 Agent 工作流 playbook，以及一个可选的 API 文档同步 prompt。
这些自动化用于规范 agent 的开发步骤、限制修改范围、并记录测试和复查过程。

## 自动化 A：Week 5 任务执行与复查器

类型：Warp Drive saved prompt

目标：把 `docs/TASKS.md` 中选择的任务变成一个可重复执行的开发循环：
阅读任务、分析代码、实现功能、补测试、跑检查、总结结果、生成 write-up 素材。

适合的任务：
- Task 2: Notes search with pagination and sorting
- Task 3: Full Notes CRUD with optimistic UI updates
- Task 4: Action items filters and bulk complete
- Task 8: List endpoint pagination for all collections
- Task 10: Test coverage improvements

输入：
- `TASK_ID`：`docs/TASKS.md` 里的任务编号
- `SCOPE`：backend、frontend、tests 或 full-stack
- `AUTONOMY`：suggest-only、edit-with-review 或 full-local-edit

复制到 Warp Drive 的 prompt：

```text
你正在 modern-software-dev-assignments 仓库根目录中工作。
严格只关注 week5/ 目录。

任务：
- 阅读 week5/docs/TASKS.md。
- 实现 TASK_ID={{TASK_ID}}。
- Scope={{SCOPE}}。
- Autonomy={{AUTONOMY}}。

工作流程：
1. 在修改前，先检查 week5 的 backend、frontend、tests 和 Makefile。
2. 用简短文字复述这个任务需要实现的行为，并列出预计会修改的文件。
3. 用最小、清晰、可审查的改动完成所选任务。
4. 添加或更新测试，证明功能正确，包括边界情况。
5. 在 week5/ 目录下运行：
   - make test
   - make lint
6. 如果测试或 lint 失败，修复问题并重新运行失败的命令。
7. 最后总结：
   - 实现了哪个任务
   - 修改了哪些文件
   - 添加或更新了哪些测试
   - 运行了哪些命令
   - 还有哪些风险或后续工作
8. 额外生成一小段可以粘贴到 week5/writeup.md 中
   "How you used the automation" 部分的文字。

约束：
- 不要修改 week5/ 之外的文件。
- 不要引入 Docker 或全局依赖。
- 除非 TASK_ID 明确要求，否则优先沿用现有项目结构，不要换框架。
- 保持改动聚焦，方便 review。
```

使用方式：

```bash
cd week5
make test
make lint
```

手动流程 vs 自动化流程：
- 手动流程：开发者需要自己阅读任务、判断文件范围、修改代码、记得补测试和跑检查。
- 自动化流程：saved prompt 会强制 agent 按照“检查、实现、测试、总结”的顺序执行，减少遗漏。

解决的痛点：
- 避免忘记补测试。
- 避免改到 `week5/` 之外。
- 避免写完代码后没有足够材料填写 `writeup.md`。

## 自动化 B：Week 5 多 Agent 并行工作流

类型：Warp multi-agent workflow prompt / playbook

目标：在多个 Warp tab 中并行运行 agent，让它们分别负责独立任务，同时降低文件冲突风险。

推荐任务组合：
- Agent 1：Task 3，Notes CRUD 和 optimistic frontend behavior
- Agent 2：Task 4，Action item filters 和 bulk complete
- 可选 Agent 3：Task 10，在前两个 agent 完成后补测试和做最终检查

Coordinator prompt：

```text
你是 Week 5 多 Agent 工作流的协调者。
严格只在 week5/ 下工作。

计划：
1. 阅读 week5/docs/TASKS.md，选择可以并行完成的独立任务。
2. 给每个 agent 分配尽量不重叠的文件范围：
   - Agent Notes 负责 backend/app/routers/notes.py、notes 相关 schemas、
     frontend 中的 notes UI，以及 backend/tests/test_notes.py。
   - Agent Actions 负责 backend/app/routers/action_items.py、action items 相关 schemas、
     frontend 中的 action item UI，以及 backend/tests/test_action_items.py。
   - Agent QA 负责测试、lint、README/writeup 记录，不主动重写功能代码。
3. 要求每个 agent 汇报：
   - 修改了哪些文件
   - 运行了哪些命令
   - 还有哪些风险
4. 每个 agent 通过自己负责范围的本地测试后，再进行合并或 review。
5. 最后在 week5/ 下运行：
   - make test
   - make lint
6. 为 week5/writeup.md 记录：
   - 并发开发带来的收益
   - 是否发生冲突
   - 如何监督 agent
   - 哪些地方需要人工 review

冲突规则：
- 所有 agent 都可以读取 week5/ 中的任意文件。
- 但每个 agent 只能编辑自己负责的文件范围。
- 如果需要修改 shared file，例如 backend/app/schemas.py，
  必须先说明要修改哪些 model/schema。
```

Agent Notes prompt：

```text
你是 Week 5 作业中的 Agent Notes。
严格只在 week5/ 下工作。

实现 week5/docs/TASKS.md 中的 Task 3：
- 添加 PUT /notes/{id} 和 DELETE /notes/{id}。
- 在 schemas.py 中校验 note payload。
- 更新前端，实现 optimistic update 和失败 rollback。
- 添加成功路径和 validation error 的测试。

你负责的文件：
- backend/app/routers/notes.py
- backend/app/schemas.py 中 notes 相关 schema
- backend/tests/test_notes.py
- frontend/app.js 中 notes 相关 UI/state
- 如有必要，可修改 frontend/index.html 和 frontend/styles.css 中 notes 相关部分

不要修改 action item 行为，除非共享前端逻辑必须这样做。
完成前，在 week5/ 下运行 make test。
```

Agent Actions prompt：

```text
你是 Week 5 作业中的 Agent Actions。
严格只在 week5/ 下工作。

实现 week5/docs/TASKS.md 中的 Task 4：
- 添加 GET /action-items?completed=true|false。
- 添加 POST /action-items/bulk-complete。
- 确保 bulk complete 具备事务行为。
- 更新前端，加入 filter toggles 和 bulk action UI。
- 添加 filters、bulk behavior 和 rollback/error cases 的测试。

你负责的文件：
- backend/app/routers/action_items.py
- backend/app/schemas.py 中 action-item 相关 schema
- backend/tests/test_action_items.py
- frontend/app.js 中 action-item 相关 UI/state
- 如有必要，可修改 frontend/index.html 和 frontend/styles.css 中 action item 相关部分

不要修改 notes 行为，除非共享前端逻辑必须这样做。
完成前，在 week5/ 下运行 make test。
```

Agent QA prompt：

```text
你是 Week 5 作业中的 Agent QA。
严格只在 week5/ 下工作。

在功能 agent 完成后：
1. 检查所有变更文件。
2. 如果明显缺少 400/404/error path 测试，就补充测试。
3. 运行：
   - make test
   - make lint
4. 除非测试失败证明功能代码有 bug，否则不要重写功能实现。
5. 输出最终 write-up 素材：
   - agent 角色分工
   - 协调策略
   - 是否出现冲突
   - 运行过的命令
   - autonomy level 和人工监督方式
```

可选的 git worktree 设置：

```bash
git worktree add ../week5-notes-agent -b ws_week5-notes-agent
git worktree add ../week5-actions-agent -b ws_week5-actions-agent
git worktree add ../week5-qa-agent -b ws_week5-qa-agent
```

每个 agent 完成后，再从主仓库分支中谨慎合并，或者分别开 PR。

解决的痛点：
- 可以让相互独立的 backend/frontend 任务并行推进。
- 通过明确文件所有权，减少多个 agent 同时改同一段代码造成的冲突。
- 方便在 `writeup.md` 中说明多 Agent 的角色、协调策略、收益和风险。

## 自动化 C：API 文档同步

类型：Warp Drive saved prompt

目标：在修改接口后，根据 FastAPI 的 OpenAPI schema 生成或更新简洁的 API 文档。

复制到 Warp Drive 的 prompt：

```text
严格只在 week5/ 下工作。

根据当前 FastAPI app 创建或更新 docs/API.md。

步骤：
1. 检查 backend/app/main.py 和 routers。
2. 使用 FastAPI 的 OpenAPI schema 作为真实来源。
3. 为每个 route 记录：
   - method 和 path
   - 用途
   - request body 或 query parameters
   - response shape
   - 常见 error cases
4. 添加一个 "Route changes from starter app" 部分，列出新增或修改过的接口。
5. 在 week5/ 下运行 make test。

约束：
- 不要手动编造没有注册到 app 中的 endpoint。
- 文档要简洁，方便 grader 快速检查。
```

解决的痛点：
- 让 API 文档和实际 endpoint 保持同步。
- 给 `writeup.md` 提供明确的自动化使用证据。
