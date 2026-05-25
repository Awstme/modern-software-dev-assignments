# Week 7 Write-up
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


## Task 1: Add more endpoints and validations
a. Links to relevant commits/issues
> PR: https://github.com/Awstme/modern-software-dev-assignments/pull/1  
> Graphite: https://app.graphite.com/github/pr/Awstme/modern-software-dev-assignments/1  
> Commit: `b221c19` (`Complete week7 task1 endpoints and validation`)

b. PR Description
> 这个任务主要增强了现有 `notes` 和 `action-items` API 的行为。我补充了按 ID 获取和删除资源的 endpoint，增加了明确的排序字段白名单，并收紧了分页参数校验：负数 `skip`、`limit=0` 和非法排序字段都会返回清晰的 422 错误，而不是静默 fallback。
>
> 我还更新了 Pydantic schema，让空白的 note title、note content 和 action-item description 都会被拒绝。PATCH schema 会去掉首尾空白，同时仍然允许字段缺省，以保留 partial update 的语义。
>
> 测试重点放在 endpoint 正确性和校验行为上：create/list/patch 流程仍然可用，get/delete 能返回预期的 200/204/404 状态，非法 payload 或 query 参数会被拒绝。后续 rebase 后我重新跑了完整后端测试：
>
> - `conda run -n cs146s python -m pytest -q backend/tests`: 测试通过
> - `conda run -n cs146s python -m ruff check backend/app backend/tests`: `All checks passed!`
>
> 主要 tradeoff 是：我保持了轻量实现，把校验放在现有 FastAPI/Pydantic 结构里，没有额外引入更重的 service layer。

c. Graphite Diamond generated code review
> Graphite found no issues. 我后续仍然做了人工 review，重点检查 API 一致性，例如非法排序字段是否返回 422、delete endpoint 是否返回空的 204 response，以及新增校验是否会破坏 PATCH 的 partial update 语义。

## Task 2: Extend extraction logic
a. Links to relevant commits/issues
> PR: https://github.com/Awstme/modern-software-dev-assignments/pull/2  
> Graphite: https://app.graphite.com/github/pr/Awstme/modern-software-dev-assignments/2  
> Commit: `f23311f` (`Extend action item extraction`)

b. PR Description
> 这个任务改进了 action item 的提取逻辑。原来的实现主要只能识别 `TODO:`、`ACTION:` 和感叹号结尾的句子，对会议记录这类文本来说覆盖范围太窄。我把它扩展成基于规则的 matcher，可以识别更常见的任务表达，例如 `follow-up`、`next step`、checkbox 格式、`please` / `need to` / `we should` 这类请求表达、`Sarah should review the PR` 这类负责人表达，以及 `due` / `by` / `before` 这类截止日期表达。
>
> 我还增加了 bullet、编号列表和 checkbox 的清理逻辑，并对结果做大小写不敏感的去重，同时保持原始顺序。
>
> 测试覆盖了原有场景、新增任务表达、checkbox/bullet 清理，以及重复 action item 的去重行为。验证命令包括：
>
> - `conda run -n cs146s python -m pytest -q backend/tests`: 测试通过
> - `conda run -n cs146s python -m ruff check backend/app/services/extract.py backend/tests/test_extract.py`: `All checks passed!`
>
> 主要 tradeoff 是：这仍然是规则驱动的提取器，不是真正的自然语言理解。它的好处是可控、易测试，但对于很模糊、强依赖上下文的会议记录表达，后续可能还需要继续调规则。

c. Graphite Diamond generated code review
> Graphite found no issues. 我仍然手动检查了 regex 边界、文本规范化和去重逻辑，因为规则式文本提取很容易写得过宽，从而产生 false positives。

## Task 3: Try adding a new model and relationships
a. Links to relevant commits/issues
> PR: https://github.com/Awstme/modern-software-dev-assignments/pull/3  
> Graphite: https://app.graphite.com/github/pr/Awstme/modern-software-dev-assignments/3  
> Commit: `1379d80` (`Add projects model and action item relationships`)

b. PR Description
> 这个任务新增了 `Project` 数据库模型，并通过可选的 `project_id` 把它和 `ActionItem` 关联起来。一个 project 可以有多个 action items，同时已有 action items 仍然可以不属于任何 project，以保持向后兼容。
>
> 我新增了 `/projects/` 相关 endpoint，用于创建、列出和获取 project；也新增了 `/projects/{project_id}/action-items`，用于查看某个 project 下的 action items。action-item 的 create、list 和 patch endpoint 现在也支持 `project_id`：创建或更新时会拒绝不存在的 project，列表可以按 project 过滤，PATCH 时传 `project_id: null` 可以取消关联。
>
> 我还更新了 seed SQL，并增加了一个很小的 runtime schema guard，让已有 SQLite 数据库可以安全增加 nullable `project_id` 字段，而不需要丢数据。
>
> 测试覆盖了创建 project、给 action item 绑定 project、列出相关 action items、按 project 过滤 action items、拒绝重复 project name，以及拒绝引用不存在的 project。解决 Task 1 和 Task 2 合并后的 rebase conflict 之后，我验证了：
>
> - `conda run -n cs146s python -m pytest -q backend/tests`: 测试通过
> - `conda run -n cs146s python -m ruff check backend/app backend/tests`: `All checks passed!`
>
> 主要 tradeoff 是：这个 starter app 没有迁移系统，所以我没有为了一个作业任务引入 Alembic，而是把 runtime schema update 控制在非常小的范围内。

c. Graphite Diamond generated code review
> Graphite found no issues. 这个任务里更有价值的是人工 review：我发现 PATCH 应该支持通过 `null` 清除 `project_id`，并且在解决与 Task 1 校验逻辑的冲突时，确保没有丢掉任何一边的功能。

## Task 4: Improve tests for pagination and sorting
a. Links to relevant commits/issues
> PR: https://github.com/Awstme/modern-software-dev-assignments/pull/4  
> Graphite: https://app.graphite.com/github/pr/Awstme/modern-software-dev-assignments/4  
> Commit: `97dd907` (`Complete week7 pagination and sorting coverage`)

b. PR Description
> 这个任务扩展了 pagination 和 sorting 的测试覆盖范围，覆盖 notes、action items、projects，以及 project-scoped action items。
>
> 我新增了 `test_pagination_sorting.py`，用 exact-window 测试替代“只检查列表非空”的弱断言。现在测试会验证按 `title`、`description`、`name`、`id` 等稳定字段排序，验证 `skip`/`limit` 返回的精确窗口，验证排序和 `completed` filter 的组合，也验证 project 列表和 project action-item 列表的分页行为。
>
> 写测试时我发现 project 相关 endpoint 的行为不如 notes/action-items 严格。因此我把 `/projects/` 对齐到其他列表 endpoint：增加 `skip >= 0`、`1 <= limit <= 200`、明确的 project sort 字段校验，以及非法 sort 返回 422。我还给 `/projects/{project_id}/action-items` 增加了排序支持和排序校验，避免它成为全应用里唯一不支持 sorting 的列表 endpoint。
>
> 验证命令：
>
> - `conda run -n cs146s python -m pytest -q backend/tests`: 测试通过
> - `conda run -n cs146s python -m ruff check backend/app backend/tests`: `All checks passed!`
> - `conda run -n cs146s python -m black backend/app/routers/projects.py backend/tests/test_pagination_sorting.py`: 格式化成功
>
> 主要 tradeoff 是：测试里我尽量避免按 `created_at` 排序，因为 SQLite 中快速插入多条记录时 timestamp 可能并列。用稳定的文本字段或 `id` 排序可以降低 flaky test 风险。

c. Graphite Diamond generated code review
> Graphite found no issues. 提交 Task 4 前，我还使用了一个只读子代理做 review；它指出了缺少 exact-window tests、`limit=201` 边界测试，以及 project pagination/sort validation 不一致的问题。这些发现直接影响了最终补丁。

## Brief Reflection
a. The types of comments you typically made in your manual reviews (e.g., correctness, performance, security, naming, test gaps, API shape, UX, docs).
> 我的人工 review 主要集中在 correctness、API shape 和 test gaps。我反复检查相似 endpoint 之间的行为是否一致：例如 notes 和 action-items 对非法 sort 字段返回 422，那么 projects 就不应该静默 fallback 到 name 排序。我也会看一些边界情况，比如空白字符串、不存在的 ID、删除不存在的记录、通过 `null` 清除 optional relationship，以及 pagination 测试是否断言了精确返回结果，而不是只检查列表非空。

b. A comparison of **your** comments vs. **Graphite’s** AI-generated comments for each PR.
> Task 1 中，我的人工 review 更关注 validation semantics 和 REST response behavior。Graphite 没有提出 blocking issue，所以我自己的 review 更具体地覆盖了 422/404/204 行为。
>
> Task 2 中，Graphite 没有要求修改。我的人工 review 更有用，因为我检查了 regex 覆盖范围、去重逻辑和 false-positive 风险。
>
> Task 3 中，最有价值的 review 来自人工冲突解决和 relationship 行为检查。我发现需要支持 PATCH 时用 `null` 清除 `project_id`，这一点 Graphite 没有指出。
>
> Task 4 中，只读 AI 子代理的 review 比 PR 级别的 Graphite metadata 更具体：它指出了 exact-window tests、project pagination/sort 行为不一致等问题。之后我的人工 review 主要确认新增测试是 deterministic 的，并确认没有把无关的 `writeup.md` 或 `AGENTS.md` 混进提交。

c. When the AI reviews were better/worse than yours (cite specific examples)
> AI review 在做 checklist generator 时更有帮助。比如 Task 4 里，子代理明确指出 exact-window pagination tests、`limit=201`、project `skip=-1` 和 invalid project sort behavior，这让最终测试覆盖更完整。
>
> AI review 比较弱的地方是只给出“没有发现问题”时。Tasks 1-3 中，Graphite 没有指出一些更细的设计问题，例如 project-scoped action items 是否也应该支持 sorting，或者 PATCH 是否应该允许取消 project 关联。这些需要人工从 API 一致性的角度判断。

d. Your comfort level trusting AI reviews going forward and any heuristics for when to rely on them.
> 我会把 AI review 当作很有价值的第二轮检查，但不会把它当作唯一 review。它很适合发现缺失测试、不一致的 endpoint 行为和常见边界情况。我会更信任它的 checklist-style 覆盖建议，但对于 API 设计、数据模型关系、规则式文本提取是否过宽这类问题，仍然需要人工最终判断。我的经验规则是：只要改动影响跨 endpoint 一致性、持久化数据或用户可见行为，即使 AI 说没有问题，也应该再做一轮人工 review。
