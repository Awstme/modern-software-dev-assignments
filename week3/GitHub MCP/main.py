"""GitHub MCP server for Week 3.

Run with STDIO transport:
    python "week3/GitHub MCP/main.py"
"""

from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

from mcp.server.fastmcp import FastMCP


logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO").upper())
logger = logging.getLogger("github-mcp")

GITHUB_API_BASE = os.getenv("GITHUB_API_BASE", "https://api.github.com")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
REQUEST_TIMEOUT_SECONDS = float(os.getenv("GITHUB_TIMEOUT_SECONDS", "10"))
MAX_RETRIES = int(os.getenv("GITHUB_MAX_RETRIES", "2"))

mcp = FastMCP("github-api-mcp")


@dataclass
class GitHubAPIError(Exception):
    """A user-facing GitHub API error."""

    message: str
    status_code: int | None = None
    rate_limit_remaining: str | None = None
    rate_limit_reset: str | None = None

    def to_result(self) -> dict[str, Any]:
        result: dict[str, Any] = {"ok": False, "error": self.message}
        if self.status_code is not None:
            result["status_code"] = self.status_code
        if self.rate_limit_remaining is not None:
            result["rate_limit_remaining"] = self.rate_limit_remaining
        if self.rate_limit_reset is not None:
            result["rate_limit_reset"] = self.rate_limit_reset
        return result


def _headers() -> dict[str, str]:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "cs146s-week3-mcp-server",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return headers


def _rate_limit_message(headers: Any) -> str | None:
    remaining = headers.get("X-RateLimit-Remaining")
    reset = headers.get("X-RateLimit-Reset")
    if remaining == "0":
        reset_text = reset or "unknown"
        return f"GitHub API rate limit exceeded. Try again after reset time {reset_text}."
    return None


def _github_get(path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    query = f"?{urlencode(params)}" if params else ""
    url = f"{GITHUB_API_BASE}{path}{query}"

    for attempt in range(MAX_RETRIES + 1):
        try:
            request = Request(url, headers=_headers(), method="GET")
            with urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
                raw = response.read().decode("utf-8")
                if not raw:
                    raise GitHubAPIError("GitHub returned an empty response.")
                return json.loads(raw)
        except HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            rate_limit_message = _rate_limit_message(exc.headers)
            if exc.code in {403, 429} and attempt < MAX_RETRIES:
                time.sleep(0.75 * (attempt + 1))
                continue

            detail = _extract_error_message(body)
            message = rate_limit_message or f"GitHub API request failed: {detail}"
            raise GitHubAPIError(
                message=message,
                status_code=exc.code,
                rate_limit_remaining=exc.headers.get("X-RateLimit-Remaining"),
                rate_limit_reset=exc.headers.get("X-RateLimit-Reset"),
            ) from exc
        except URLError as exc:
            if attempt < MAX_RETRIES:
                time.sleep(0.5 * (attempt + 1))
                continue
            raise GitHubAPIError(f"Could not reach GitHub API: {exc.reason}") from exc
        except TimeoutError as exc:
            if attempt < MAX_RETRIES:
                time.sleep(0.5 * (attempt + 1))
                continue
            raise GitHubAPIError("GitHub API request timed out.") from exc
        except json.JSONDecodeError as exc:
            raise GitHubAPIError("GitHub returned invalid JSON.") from exc

    raise GitHubAPIError("GitHub API request failed after retries.")


def _extract_error_message(body: str) -> str:
    try:
        parsed = json.loads(body)
    except json.JSONDecodeError:
        return body[:300] or "no response body"
    return str(parsed.get("message") or parsed)[:300]


def _repo_path(owner: str, repo: str) -> str:
    clean_owner = owner.strip()
    clean_repo = repo.strip()
    if not clean_owner or not clean_repo:
        raise GitHubAPIError("Both owner and repo are required.")
    return f"/repos/{quote(clean_owner, safe='')}/{quote(clean_repo, safe='')}"


@mcp.tool()
def search_github_repos(query: str, max_results: int = 5) -> dict[str, Any]:
    """Search GitHub repositories by keyword, language, topic, or owner."""

    clean_query = query.strip()
    if not clean_query:
        return {"ok": False, "error": "query must not be empty"}

    limit = max(1, min(max_results, 10))
    try:
        data = _github_get(
            "/search/repositories",
            {"q": clean_query, "per_page": limit, "sort": "stars", "order": "desc"},
        )
    except GitHubAPIError as exc:
        logger.warning("search_github_repos failed: %s", exc.message)
        return exc.to_result()

    items = data.get("items", [])
    if not items:
        return {"ok": True, "query": clean_query, "total_count": 0, "repositories": []}

    repositories = [
        {
            "full_name": item.get("full_name"),
            "description": item.get("description"),
            "stars": item.get("stargazers_count"),
            "forks": item.get("forks_count"),
            "language": item.get("language"),
            "url": item.get("html_url"),
            "updated_at": item.get("updated_at"),
        }
        for item in items
    ]

    return {
        "ok": True,
        "query": clean_query,
        "total_count": data.get("total_count", len(repositories)),
        "repositories": repositories,
    }


@mcp.tool()
def get_repo_info(owner: str, repo: str) -> dict[str, Any]:
    """Get summary metadata for a GitHub repository."""

    try:
        data = _github_get(_repo_path(owner, repo))
    except GitHubAPIError as exc:
        logger.warning("get_repo_info failed: %s", exc.message)
        return exc.to_result()

    if not data:
        return {"ok": False, "error": "GitHub returned no repository data."}

    return {
        "ok": True,
        "full_name": data.get("full_name"),
        "description": data.get("description"),
        "stars": data.get("stargazers_count"),
        "forks": data.get("forks_count"),
        "watchers": data.get("watchers_count"),
        "open_issues": data.get("open_issues_count"),
        "language": data.get("language"),
        "license": (data.get("license") or {}).get("spdx_id"),
        "default_branch": data.get("default_branch"),
        "created_at": data.get("created_at"),
        "updated_at": data.get("updated_at"),
        "pushed_at": data.get("pushed_at"),
        "url": data.get("html_url"),
    }


if __name__ == "__main__":
    mcp.run()
