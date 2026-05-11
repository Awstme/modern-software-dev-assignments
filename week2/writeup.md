# Week 2 Write-up
Tip: To preview this markdown file
- On Mac, press `Command (⌘) + Shift + V`
- On Windows/Linux, press `Ctrl + Shift + V`

## INSTRUCTIONS

Fill out all of the `TODO`s in this file.

## SUBMISSION DETAILS

Name: **TODO** \
SUNet ID: **TODO** \
Citations: Used Kilo Code to generate and refactor code.

This assignment took me about **1** hours to do. 


## YOUR RESPONSES
For each exercise, please include what prompts you used to generate the answer, in addition to the location of the generated response. Make sure to clearly add comments in your code documenting which parts are generated.

### Exercise 1: Scaffold a New Feature
Prompt: 
```
在 week2/app/services/extract.py 中实现 extract_action_items_llm() 函数，作为 extract_action_items() 的 LLM 驱动替代方案。使用 ollama.chat() 调用本地 LLM，通过 structured output (JSON schema) 强制返回 JSON 格式的 action items 数组。要求：temperature=0 保证确定性输出，空输入直接返回空列表，输出需去重。
``` 

Generated Code Snippets:
```
week2/app/services/extract.py:100-129 — extract_action_items_llm() 函数实现
  - 使用 ollama.chat() + format 参数实现 structured output
  - _ACTION_ITEM_SCHEMA (lines 17-26) 定义 JSON Schema
  - _deduplicate() (lines 29-38) 抽取的去重逻辑被两个函数共用
```

### Exercise 2: Add Unit Tests
Prompt: 
```
在 week2/tests/test_extract.py 中为 extract_action_items_llm() 编写单元测试，覆盖多种输入情况（项目符号列表、关键词前缀行、空输入、纯叙述文本、去重、混合内容、JSON 解析异常、参数校验）。使用 unittest.mock.patch mock ollama.chat 避免真实 LLM 调用。
``` 

Generated Code Snippets:
```
week2/tests/test_extract.py:36-40 — _mock_chat_response() 辅助函数
week2/tests/test_extract.py:48-66 — test_llm_extract_bullets_and_checkboxes
week2/tests/test_extract.py:69-86 — test_llm_extract_keyword_prefixes
week2/tests/test_extract.py:89-93 — test_llm_extract_empty_input
week2/tests/test_extract.py:96-100 — test_llm_extract_whitespace_only
week2/tests/test_extract.py:103-113 — test_llm_extract_narrative_only
week2/tests/test_extract.py:116-125 — test_llm_extract_deduplication
week2/tests/test_extract.py:128-144 — test_llm_extract_mixed_content
week2/tests/test_extract.py:147-154 — test_llm_extract_malformed_json
week2/tests/test_extract.py:157-164 — test_llm_extract_missing_action_items_key
week2/tests/test_extract.py:167-186 — test_llm_extract_calls_model_with_correct_params
```

### Exercise 3: Refactor Existing Code for Clarity
Prompt: 
```
对后端代码进行重构，特别关注：1) 定义清晰的 API 契约/Schema（Pydantic 请求/响应模型）；2) 数据库层清理（从原始 sqlite3 迁移到 SQLAlchemy ORM + session 管理）；3) 应用生命周期/配置（FastAPI lifespan 事件 + pydantic-settings Settings 类）；4) 错误处理（全局异常处理器 + HTTP 404 处理）。
``` 

Generated/Modified Code Snippets:
```
week2/app/schemas.py (全部 49 行) — 新增 Pydantic 请求/响应模型
  - NoteCreate, ActionItemExtract, ActionItemMarkDone (请求)
  - NoteResponse, ActionItemBrief, ActionItemDetail, ExtractResponse (响应)

week2/app/config.py (全部 14 行) — 新增 Settings 配置类
  - 使用 pydantic-settings 从 .env 读取 db_url, llm_model, ollama_host

week2/app/db.py (全部 74 行) — 重构：原始 sqlite3 → SQLAlchemy ORM
  - Note, ActionItem ORM 模型 (lines 43-70)
  - get_db() 依赖注入 (lines 28-33)
  - init_db() 使用 Base.metadata.create_all (lines 73-74)

week2/app/main.py (全部 42 行) — 重构：lifespan 事件 + 全局异常处理
  - lifespan 上下文管理器 (lines 15-18)
  - global_exception_handler (lines 24-29)

week2/app/routers/notes.py (全部 32 行) — 重构：Pydantic Schema + 新增 list_notes 端点
  - POST /notes 使用 NoteCreate schema (line 13)
  - GET /notes 列表端点 (lines 29-32)

week2/app/routers/action_items.py (全部 78 行) — 重构：Pydantic Schema + 404 处理
  - POST /extract 使用 ActionItemExtract schema (line 21)
  - POST /{id}/done 返回 404 当 item 不存在 (lines 67-68)

week2/app/services/extract.py — 清理：去重逻辑抽取 + 移除未使用导入
  - _deduplicate() 共享函数 (lines 29-38)
  - 模型名从 settings.llm_model 读取 (line 106)

week2/app/services/__init__.py — 新增缺失的包初始化文件

week2/tests/test_extract.py — 更新：模型名断言改为 settings.llm_model (line 174)
```


### Exercise 4: Use Agentic Mode to Automate a Small Task
Prompt: 
```
将 LLM 驱动的提取集成为新的端点。更新前端以包含一个 "Extract LLM" 按钮，点击后通过新端点触发提取过程。暴露一个最终端点以检索所有笔记。更新前端以包含一个 "List Notes" 按钮，点击后获取并显示笔记。
``` 

Generated Code Snippets:
```
week2/app/routers/action_items.py:14 — 新增 extract_action_items_llm 导入
week2/app/routers/action_items.py:42-62 — POST /action-items/extract-llm 端点
  - 复用 ActionItemExtract schema，调用 extract_action_items_llm()

week2/app/routers/notes.py:29-32 — GET /notes 列表端点
  - 按 id 降序返回所有笔记

week2/frontend/index.html:35 — "Extract LLM" 按钮
week2/frontend/index.html:42 — "List Notes" 按钮
week2/frontend/index.html:55-88 — doExtract(endpoint) 共用提取逻辑
week2/frontend/index.html:90-91 — 两个 Extract 按钮事件绑定
week2/frontend/index.html:93-114 — List Notes 点击事件，以卡片形式展示笔记
```


### Exercise 5: Generate a README from the Codebase
Prompt: 
```
分析当前代码库并生成结构良好的 README.md 文件。README 应至少包含：项目的简要概述、如何设置和运行项目、API 端点和功能、运行测试套件的说明。
``` 

Generated Code Snippets:
```
week2/README.md (全部) — 项目 README 文件
  - 项目概述与目录结构
  - 安装、配置与启动说明
  - API 端点表格（Notes、Action Items）
  - curl 示例与响应
  - 两种提取策略说明（Heuristic / LLM）
  - 测试套件说明与覆盖率表格
```


## SUBMISSION INSTRUCTIONS
1. Hit a `Command (⌘) + F` (or `Ctrl + F`) to find any remaining `TODO`s in this file. If no results are found, congratulations – you've completed all required fields. 
2. Make sure you have all changes pushed to your remote repository for grading.
3. Submit via Gradescope. 