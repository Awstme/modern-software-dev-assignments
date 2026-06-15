# Week 6 Write-up
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


## Brief findings overview 
我运行了 Semgrep：

```bash
semgrep ci --subdir week6
```

Semgrep 报告了三类主要问题：

- **SAST / Code findings:** CORS 使用通配符、动态拼接 SQL 导致 SQL 注入风险、`eval()` 执行用户输入、`subprocess.run(..., shell=True)` 命令注入风险、动态 `urllib` 请求、以及用户可控路径读取文件。
- **Secrets findings:** `backend/app/services/extract.py` 中存在类似 API token 的硬编码示例值。
- **SCA / Supply Chain findings:** `requirements.txt` 固定了多个较旧且存在已知漏洞的依赖，例如 `Werkzeug==0.14.1`、`requests==2.19.1`、`PyYAML==5.1`、`Jinja2==2.10.1` 和 `pydantic==1.5.1`。

我优先修复了最直接的应用代码问题：不安全的 SQL 构造、危险的 debug 执行端点、以及不安全的浏览器/CORS 行为。我也移除了硬编码的示例 token。修复后重新运行 `semgrep ci --subdir week6`，findings 从 36 个降到 26 个；剩余结果主要是 `requirements.txt` 中旧依赖造成的 SCA findings，以及两个 ORM 分页处的非阻塞通用数据库查询警告。

对于 Semgrep 在 ORM 分页处报告的通用数据库查询警告（`db.execute(stmt.offset(skip).limit(limit))`），我没有把它当作真实 SQL 注入处理，因为查询是通过 SQLAlchemy ORM 表达式构建的，不是字符串拼接；不过我仍然用 `Query(0, ge=0)` 限制了 `skip`，避免负数 offset。

验证命令：

```bash
conda run -n cs146s make test
conda run -n cs146s make lint
semgrep ci --subdir week6
```

结果：测试 `3 passed`；ruff `All checks passed!`；Semgrep CI scan completed successfully，剩余 26 个非阻塞 findings。

## Fix #1
a. File and line(s)
> `week6/backend/app/routers/notes.py`，原始问题在第 71-80 行；修复后对应第 61-70 行。

b. Rule/category Semgrep flagged
> SAST：`python.sqlalchemy.security.audit.avoid-sqlalchemy-text.avoid-sqlalchemy-text`，以及 SQL injection / tainted database query 类规则。

c. Brief risk description
> 原来的 `unsafe_search` 端点把用户控制的 `q` 参数直接插入 SQL 字符串。攻击者可以构造特殊输入改变查询逻辑，进而读取、修改或删除数据。

d. Your change (short code diff or explanation, AI coding tool usage)
> 我使用 AI coding assistant 将 f-string SQL 和 `sqlalchemy.text(...)` 替换为 SQLAlchemy ORM 表达式：
>
> ```python
> stmt = (
>     select(Note)
>     .where((Note.title.contains(q)) | (Note.content.contains(q)))
>     .order_by(desc(Note.created_at))
>     .limit(50)
> )
> rows = db.execute(stmt).scalars().all()
> ```

e. Why this mitigates the issue
> 现在由 SQLAlchemy 构建 SQL 表达式并安全处理用户输入，而不是把原始输入拼接进 SQL 文本。这样保留了搜索功能，同时移除了注入路径。

## Fix #2
a. File and line(s)
> `week6/backend/app/routers/notes.py`，原始问题在第 102-113 行；危险的 debug 端点已被删除。

b. Rule/category Semgrep flagged
> SAST：`python.fastapi.code.tainted-code-stdlib-fastapi.tainted-code-stdlib-fastapi`、`python.lang.security.audit.eval-detected.eval-detected`、`python.fastapi.os.tainted-os-command-stdlib-fastapi-secure-default` 和 `python.lang.security.audit.subprocess-shell-true.subprocess-shell-true`。

c. Brief risk description
> 原来的 `/debug/eval` 使用 `eval()` 执行用户控制的 Python 表达式，可能导致任意代码执行。原来的 `/debug/run` 使用 `shell=True` 执行用户控制的 shell 命令，可能导致命令注入，甚至控制主机。

d. Your change (short code diff or explanation, AI coding tool usage)
> 我使用 AI coding assistant 直接删除了这两个 debug 端点，因为核心应用和测试都不依赖它们：
>
> ```python
> @router.get("/debug/eval")
> def debug_eval(expr: str) -> dict[str, str]:
>     result = str(eval(expr))
>     return {"result": result}
>
> @router.get("/debug/run")
> def debug_run(cmd: str) -> dict[str, str]:
>     completed = subprocess.run(cmd, shell=True, ...)
> ```

e. Why this mitigates the issue
> 删除端点可以直接移除攻击面，比尝试净化任意代码或 shell 命令更安全。由于这些端点只是 debug helper，不属于 notes/action-items 的核心功能，这是最小且更稳妥的修复。

## Fix #3
a. File and line(s)
> `week6/backend/app/main.py`，原始问题在第 22-28 行；修复后对应第 22-33 行。另一个浏览器侧加固在 `week6/frontend/app.js`，原始问题在第 14 行；修复后对应第 13-18 行。

b. Rule/category Semgrep flagged
> SAST：`python.fastapi.security.wildcard-cors.wildcard-cors`。我还修复了一个相关的前端 DOM XSS 风险：原代码用 `innerHTML` 渲染用户控制的 note 内容。

c. Brief risk description
> 旧的 CORS 配置在启用 credentials 的同时允许任意 origin。以后如果加入认证，不可信网站可能发起带凭据的跨域请求。前端还用 `innerHTML` 展示 note 标题和内容，恶意 note 可以向页面注入 HTML 或脚本。

d. Your change (short code diff or explanation, AI coding tool usage)
> 我使用 AI coding assistant 将 wildcard CORS 改为由 `CORS_ALLOW_ORIGINS` 控制的 allowlist，并限制允许的方法和请求头：
>
> ```python
> allowed_origins = os.getenv(
>     "CORS_ALLOW_ORIGINS",
>     "http://127.0.0.1:8000,http://localhost:8000",
> ).split(",")
>
> allow_origins=allowed_origins,
> allow_methods=["GET", "POST", "PUT", "PATCH", "OPTIONS"],
> allow_headers=["Content-Type", "Authorization"],
> ```
>
> 我也将前端的 `innerHTML` 改为 DOM API 和 `textContent`：
>
> ```javascript
> const title = document.createElement('strong');
> title.textContent = n.title;
> li.appendChild(title);
> li.append(': ' + n.content);
> ```

e. Why this mitigates the issue
> API 默认不再接受来自任意 origin 的带凭据浏览器请求。前端现在把 note 数据当作普通文本处理，用户控制的内容不会再被浏览器解释为 HTML 或脚本。
