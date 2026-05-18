# Week 4 Write-up
Tip: To preview this markdown file
- On Mac, press `Command (⌘) + Shift + V`
- On Windows/Linux, press `Ctrl + Shift + V`

## SUBMISSION DETAILS

Name: **TODO** \
SUNet ID: **TODO** \
Citations: **TODO**

This assignment took me about **1** hours to do. 


## YOUR RESPONSES
### Automation #1
a. Design inspiration (e.g. cite the best-practices and/or sub-agents docs)
> 我创建了 `CLAUDE.md` 作为仓库级 guidance automation。它的设计参考了 Claude Code best practices 中关于为 agent 提供稳定项目上下文、可重复命令和安全边界的建议。这样做的目标是减少每次 coding task 之前都要重新解释项目结构和开发流程的成本。

b. Design of each automation, including goals, inputs/outputs, steps
> 目标：给 coding agent 一份简洁的 Week 4 app 项目地图，以及一个安全修改 API endpoint 的工作流。输入是之后任何关于修改 app 的请求。输出是更一致的文件定位、测试选择、实现顺序和验证步骤。主要步骤包括：先阅读项目地图，找到相关的 router/schema/model/test 文件，补充聚焦的测试，实现最小必要改动，在涉及用户界面时更新静态前端，最后运行验证命令。

c. How to run it (exact commands), expected outputs, and rollback/safety notes
> 文件位置：`week4/CLAUDE.md`。在 `week4/` 上下文中使用 Claude Code 时，它会自动读取这个文件。预期输出是范围更清晰的代码修改，以及包含 changed files 和 verification results 的最终总结。安全说明：该文件明确要求避免大范围重构、避免 raw SQL、保留 FastAPI response model，并把 `make test` / `make lint` 作为验证门槛。回滚方式是使用普通 git rollback 回退 `CLAUDE.md` 或对应 feature branch 的改动。

d. Before vs. after (i.e. manual workflow vs. automated workflow)
> Before：我需要手动记住 routers、schemas、tests、seed data 和 frontend files 分别在哪里。After：agent 有了一份稳定的项目地图和可重复的 endpoint 修改流程，因此添加功能时不需要反复重新探索项目结构，也更不容易漏掉测试步骤。

e. How you used the automation to enhance the starter application
> 我使用 `CLAUDE.md` 中定义的 workflow 来限定 notes 功能增强的范围。它把改动引导到 `backend/app/routers/notes.py`、`backend/app/schemas.py`、`backend/tests/test_notes.py` 和静态前端文件中。最终我完成了大小写不敏感的 note search、note editing、note deletion，以及对应的 validation test coverage。


### Automation #2
a. Design inspiration (e.g. cite the best-practices and/or sub-agents docs)
> 我创建了 `.claude/commands/safe-change.md` 作为 custom slash-command workflow。它的设计参考了 Claude Code best practices 中把重复开发流程沉淀成 reusable commands 的建议，也参考了 SubAgents overview 中关于清晰角色边界和明确 handoff 的思想。

b. Design of each automation, including goals, inputs/outputs, steps
> 目标：为小型 feature work 提供一个可复用的 safe-change checklist。输入是 `$ARGUMENTS`，例如 “add note delete endpoint” 或 “extend extraction tags”。输出是一份经过测试的实现总结，包括 changed files、verification results、rollback notes 和 remaining risks。步骤包括：重述需求，阅读 `docs/TASKS.md` 和 `CLAUDE.md`，选择正确的测试文件，新增或更新测试，实现最小必要改动，运行 `make test`，修复失败并总结结果。

c. How to run it (exact commands), expected outputs, and rollback/safety notes
> 在 `week4/` 目录下的 Claude Code 中运行：`/safe-change <feature request>`。例如：`/safe-change add edit and delete support for notes`。预期输出包括简短实现计划、代码改动、测试结果和最终总结。安全说明：这个 command 明确禁止删除数据文件、reset git state、添加前端构建系统，或者在没有说明的情况下静默修改数据库迁移相关内容。

d. Before vs. after (i.e. manual workflow vs. automated workflow)
> Before：feature work 通常是临时地读文件、改代码，然后再想起来要不要测试。After：这个 command 强制使用 test-first 的路径，并要求最后给出可预测的 closeout summary，因此小型 backend/frontend 改动更容易 review。

e. How you used the automation to enhance the starter application
> 我使用 safe-change flow 完成了两个 starter app 改进。第一，我增强了 notes 功能，加入大小写不敏感的搜索，并新增 `PUT /notes/{id}` 和 `DELETE /notes/{id}`，同时补充测试和前端控制。第二，我扩展了 extraction behavior，新增 `extract_tags()`，并测试它能按首次出现顺序去重提取 `#frontend`、`#urgent`、`#qa-check` 这类 tags。


### *(Optional) Automation #3*
*If you choose to build additional automations, feel free to detail them here!*

a. Design inspiration (e.g. cite the best-practices and/or sub-agents docs)
> TODO

b. Design of each automation, including goals, inputs/outputs, steps
> TODO

c. How to run it (exact commands), expected outputs, and rollback/safety notes
> TODO

d. Before vs. after (i.e. manual workflow vs. automated workflow)
> TODO

e. How you used the automation to enhance the starter application
> TODO
