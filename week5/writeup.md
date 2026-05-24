# Week 5 Write-up
Tip: To preview this markdown file
- On Mac, press `Command (⌘) + Shift + V`
- On Windows/Linux, press `Ctrl + Shift + V`

## INSTRUCTIONS

Fill out all of the `TODO`s in this file.

## SUBMISSION DETAILS

Name: **TODO** \
SUNet ID: **TODO** \
Citations: **TODO**

This assignment took me about **TODO** hours to do. 


## YOUR RESPONSES

### Automation A: Warp Drive saved prompts, rules, MCP servers

a. Design of each automation, including goals, inputs/outputs, steps
> 我创建了一个可复用的 Warp Drive saved prompt，名称是 **Week 5 Task Runner and Reviewer**，具体定义记录在 `docs/WARP_AUTOMATIONS.md` 中。它的目标是把 `docs/TASKS.md` 中的一个任务转换成可重复执行的开发流程。输入包括 `TASK_ID`、`SCOPE` 和 `AUTONOMY`；输出包括代码修改、测试结果、命令运行结果，以及可以放进 write-up 的简短总结。执行步骤是：先检查 Week 5 的 backend/frontend/tests，再复述目标行为，接着用最小的清晰改动实现功能，补充测试，运行 `make test` 和 `make lint`，修复失败项，最后总结结果。

b. Before vs. after (i.e. manual workflow vs. automated workflow)
> 在没有自动化之前，我需要手动阅读 `TASKS.md`，判断要修改哪些文件，提醒自己补测试，并在完成后再整理 write-up 素材。使用自动化之后，prompt 会强制按照固定顺序执行：先检查代码，再只在 `week5/` 内修改，之后运行测试和 lint，最后总结。这减少了忘记测试、改动范围过大、事后难以回忆过程的问题。

c. Autonomy levels used for each completed task (what code permissions, why, and how you supervised)
> 我使用的是 edit-with-review 级别的 autonomy。因为作业明确要求只在 `week5/` 内工作，所以 agent 可以修改 `week5/` 下的代码、测试、前端和文档。我通过限制文件所有权、检查 routers/schemas/tests/frontend 的 diff、以及要求最终使用 `conda run -n cs146s make test` 和 `conda run -n cs146s make lint` 验证结果来监督 agent。

d. (if applicable) Multi-agent notes: roles, coordination strategy, and concurrency wins/risks/failures
> Automation A 本身是单 agent 的 saved prompt，所以它不直接依赖多个 agent。不过它的总结格式仍然很有用，可以用来收集多 agent 工作流结束后的修改文件、测试命令和风险说明。

e. How you used the automation (what pain point it resolves or accelerates)
> 我在实现 Task 3 和 Task 4 时使用了这个自动化模式。它加速了几个重复步骤：定位文件、实现 endpoint 行为、更新 UI 状态、补充测试、运行检查。它也直接产出了 write-up 所需的过程记录，而不是等代码写完后再凭记忆补充。

### Automation B: Multi-agent workflows in Warp

a. Design of each automation, including goals, inputs/outputs, steps
> 我创建了一个 **Week 5 Multi-Agent Worktree Playbook**，记录在 `docs/WARP_AUTOMATIONS.md` 中。它的目标是让多个独立 agent 并行工作，同时避免互相覆盖修改。输入包括所选任务、每个 agent 的文件所有权范围，以及 branch/worktree 名称。文档中记录的分支名是 `ws_week5-notes-agent`、`ws_week5-actions-agent` 和 `ws_week5-qa-agent`。这个流程把 Task 3 分给 Agent Notes，把 Task 4 分给 Agent Actions，把最终检查交给 Agent QA。每个 agent 完成后需要汇报修改文件、运行命令和潜在风险，再由 coordinator 做最终整合和检查。

b. Before vs. after (i.e. manual workflow vs. automated workflow)
> 在没有多 agent 工作流之前，一个开发者需要串行完成 Notes CRUD、action item 过滤、bulk complete、前端连接和测试。使用多 agent 工作流之后，工作按所有权拆分：一个 agent 专注 notes，一个 agent 专注 action items，一个 agent 负责 QA。这样可以让相互独立的功能并行推进，同时保留清晰的 review 边界。

c. Autonomy levels used for each completed task (what code permissions, why, and how you supervised)
> 我使用的是 bounded local-edit autonomy。Agent Actions 只被允许修改 `backend/app/routers/action_items.py`、`backend/app/schemas.py` 中 action-item 相关 schema，以及 `backend/tests/test_action_items.py`。主线程负责 Notes CRUD 和前端整合。Agent QA 是只读角色，负责报告项目模式和潜在注意事项。我通过检查合并后的 diff、统一前端 bulk 请求和后端 endpoint 的 request body、修复 notes search 测试中放错位置的断言，以及运行最终 conda 检查来监督整个流程。

d. (if applicable) Multi-agent notes: roles, coordination strategy, and concurrency wins/risks/failures
> 角色分工如下：Agent Notes/main 实现了 `PUT /notes/{id}`、`DELETE /notes/{id}`、note validation、note tests，以及前端 optimistic UI 行为。Agent Actions 实现了 `GET /action-items/?completed=true|false`、`POST /action-items/bulk-complete` 和 action-item tests。Agent QA 检查了项目结构，并提醒了临时 SQLite fixture、事务回滚预期、前端状态管理，以及 notes 测试中有一个断言位置可疑。主要协调风险是共享文件 `schemas.py` 和 `frontend/app.js`；我通过审查合并后的 diff，并统一前端 bulk 请求和后端 endpoint 的格式来处理。主要并发收益是 Task 4 的后端和测试可以独立推进，同时 Notes CRUD 和前端 UI 也能继续完成。

e. How you used the automation (what pain point it resolves or accelerates)
> 这个多 agent 工作流加速了 `TASKS.md` 中两个相对独立的功能任务：Task 3 和 Task 4。它减少了上下文切换，因为每个 agent 都有明确的负责范围。它也提前暴露了一个集成问题：action-item bulk endpoint 和前端需要对 request body 格式达成一致。最终结果通过 `conda run -n cs146s make test` 和 `conda run -n cs146s make lint` 验证。

### (Optional) Automation C: API Docs Sync

a. Design of each automation, including goals, inputs/outputs, steps
> 我还在 `docs/WARP_AUTOMATIONS.md` 中记录了一个可选的 **API Docs Sync** prompt。它的目标是在 endpoint 修改之后，根据 FastAPI routes 和 OpenAPI schema 生成或更新 `docs/API.md`。输入是当前 FastAPI app，输出是简洁的 route summary，包括 method/path、用途、参数或 request body、response shape 和常见错误情况。

b. Before vs. after (i.e. manual workflow vs. automated workflow)
> 在没有这个自动化之前，API 文档需要手动维护，容易和真实 FastAPI routes 不一致。使用这个自动化之后，prompt 会要求 agent 以 app 中注册的 routes 作为真实来源，并列出相对于 starter app 的 route changes。

c. Autonomy levels used for each completed task (what code permissions, why, and how you supervised)
> 这个自动化适合 suggest-or-edit-with-review autonomy。它可以修改 `week5/docs/` 下的文档文件，但默认不应该修改功能代码；除非发现 route 和文档明显不一致，并且经过人工确认，才考虑进一步改代码。

d. (if applicable) Multi-agent notes: roles, coordination strategy, and concurrency wins/risks/failures
> API Docs Sync 最适合在功能 agent 完成之后运行。它可以分配给 QA/documentation agent，因为它主要负责文档同步，不应该和功能 agent 竞争 routers 或 schemas 的编辑权。

e. How you used the automation (what pain point it resolves or accelerates)
> 我把它作为补充自动化设计，用来让 endpoint 改动更容易 review。Task 3 和 Task 4 添加新 route 之后，这个自动化可以用较低风险的方式保持文档同步。
