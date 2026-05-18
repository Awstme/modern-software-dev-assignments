# Week 3 - GitHub API MCP Server

This project implements a local STDIO Model Context Protocol (MCP) server that wraps the GitHub REST API.

## External API

The server uses these GitHub REST API endpoints:

- `GET /search/repositories` for repository search.
- `GET /repos/{owner}/{repo}` for repository metadata.

GitHub allows unauthenticated requests with low rate limits. For better limits, set a personal access token in `GITHUB_TOKEN`.

## Tools

### `search_github_repos`

Searches GitHub repositories and returns a compact list sorted by stars.

Parameters:

- `query` string, required. Examples: `mcp language:python`, `topic:llm`, `owner:modelcontextprotocol`.
- `max_results` integer, optional. Defaults to `5`, capped at `10`.

Example input:

```json
{
  "query": "mcp language:python",
  "max_results": 3
}
```

Example output:

```json
{
  "ok": true,
  "query": "mcp language:python",
  "total_count": 123,
  "repositories": [
    {
      "full_name": "owner/repo",
      "description": "Repository description",
      "stars": 1000,
      "forks": 100,
      "language": "Python",
      "url": "https://github.com/owner/repo",
      "updated_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

### `get_repo_info`

Gets summary metadata for a repository.

Parameters:

- `owner` string, required. Example: `modelcontextprotocol`.
- `repo` string, required. Example: `python-sdk`.

Example input:

```json
{
  "owner": "modelcontextprotocol",
  "repo": "python-sdk"
}
```

Example output:

```json
{
  "ok": true,
  "full_name": "modelcontextprotocol/python-sdk",
  "description": "The official Python SDK for Model Context Protocol servers and clients",
  "stars": 10000,
  "forks": 1000,
  "watchers": 10000,
  "open_issues": 100,
  "language": "Python",
  "license": "MIT",
  "default_branch": "main",
  "url": "https://github.com/modelcontextprotocol/python-sdk"
}
```

## Resilience

The server includes:

- Input validation for empty search queries and missing repository names.
- Graceful user-facing errors for HTTP failures, network failures, timeouts, empty responses, and invalid JSON.
- Rate-limit awareness through GitHub `X-RateLimit-*` response headers.
- Small retry/backoff behavior for temporary network errors and rate-limit-like responses.
- Logging to stderr, which keeps STDIO transport clean for MCP messages.

## Setup

Use the course conda environment:

```bash
conda activate cs146s
python -m pip install -r "week3/GitHub MCP/requirements.txt"
```

Optional environment variables:

```bash
export GITHUB_TOKEN="your_github_token"
export GITHUB_TIMEOUT_SECONDS=10
export GITHUB_MAX_RETRIES=2
export LOG_LEVEL=INFO
```

## Run Locally

From the repository root:

```bash
conda activate cs146s
python "week3/GitHub MCP/main.py"
```

The server uses STDIO transport, so it is normally launched by an MCP client rather than used directly in a terminal.

## Claude Desktop Configuration

Add this to your Claude Desktop MCP configuration. Replace `/absolute/path/to/modern-software-dev-assignments` with your local repository path.

```json
{
  "mcpServers": {
    "github-api-mcp": {
      "command": "/opt/homebrew/Caskroom/miniconda/base/envs/cs146s/bin/python",
      "args": [
        "/absolute/path/to/modern-software-dev-assignments/week3/GitHub MCP/main.py"
      ],
      "env": {
        "GITHUB_TOKEN": "optional_github_token"
      }
    }
  }
}
```

After restarting Claude Desktop, ask:

- `Search GitHub repos for "mcp language:python" and show the top 3.`
- `Get repository info for modelcontextprotocol/python-sdk.`

## Local Inspector Debugging

If you have the MCP inspector available, run:

```bash
conda activate cs146s
npx @modelcontextprotocol/inspector python "week3/GitHub MCP/main.py"
```

Then call the tools from the inspector UI and verify their JSON responses.

## Files

- `main.py`: MCP server entrypoint and GitHub API wrapper.
- `requirements.txt`: Python dependencies for this assignment.
- `README.md`: Setup, client configuration, and tool reference.
