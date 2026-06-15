from __future__ import annotations

import json
import re

from ollama import chat

from ..config import settings

BULLET_PREFIX_PATTERN = re.compile(r"^\s*([-*•]|\d+\.)\s+")
KEYWORD_PREFIXES = (
    "todo:",
    "action:",
    "next:",
)

_ACTION_ITEM_SCHEMA = {
    "type": "object",
    "properties": {
        "action_items": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
    "required": ["action_items"],
}


def _deduplicate(items: list[str]) -> list[str]:
    seen: set[str] = set()
    unique: list[str] = []
    for item in items:
        lowered = item.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        unique.append(item)
    return unique


def _is_action_line(line: str) -> bool:
    stripped = line.strip().lower()
    if not stripped:
        return False
    if BULLET_PREFIX_PATTERN.match(stripped):
        return True
    if any(stripped.startswith(prefix) for prefix in KEYWORD_PREFIXES):
        return True
    if "[ ]" in stripped or "[todo]" in stripped:
        return True
    return False


def _looks_imperative(sentence: str) -> bool:
    words = re.findall(r"[A-Za-z']+", sentence)
    if not words:
        return False
    first = words[0]
    imperative_starters = {
        "add",
        "create",
        "implement",
        "fix",
        "update",
        "write",
        "check",
        "verify",
        "refactor",
        "document",
        "design",
        "investigate",
    }
    return first.lower() in imperative_starters


def extract_action_items(text: str) -> list[str]:
    lines = text.splitlines()
    extracted: list[str] = []
    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            continue
        if _is_action_line(line):
            cleaned = BULLET_PREFIX_PATTERN.sub("", line)
            cleaned = cleaned.strip()
            cleaned = cleaned.removeprefix("[ ]").strip()
            cleaned = cleaned.removeprefix("[todo]").strip()
            extracted.append(cleaned)
    if not extracted:
        sentences = re.split(r"(?<=[.!?])\s+", text.strip())
        for sentence in sentences:
            s = sentence.strip()
            if not s:
                continue
            if _looks_imperative(s):
                extracted.append(s)
    return _deduplicate(extracted)


def extract_action_items_llm(text: str) -> list[str]:
    text = text.strip()
    if not text:
        return []

    resp = chat(
        model=settings.llm_model,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a helpful assistant that extracts action items or todos from text. "
                    "Return the action items as a JSON array of strings. "
                    "Only include items that are clearly tasks, action items, or todos. "
                    "Ignore narrative text that is not an action item."
                ),
            },
            {"role": "user", "content": text},
        ],
        format=_ACTION_ITEM_SCHEMA,
        options={"temperature": 0},
    )

    try:
        body = json.loads(resp.message.content)
        items: list[str] = body.get("action_items", [])
    except (json.JSONDecodeError, KeyError, TypeError):
        items = []

    return _deduplicate(items)
