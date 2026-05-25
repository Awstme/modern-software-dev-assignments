import re

ACTION_PREFIX_RE = re.compile(
    r"^(todo|to-do|action|action item|next step|follow[- ]?up|fixme)\s*:?\s+",
    re.IGNORECASE,
)
ACTION_PHRASE_RE = re.compile(
    r"\b(please|need to|needs to|remember to|follow up|we should|we need to|"
    r"must|should|assign|schedule|send|review|update|finish|ship)\b",
    re.IGNORECASE,
)
ASSIGNEE_RE = re.compile(r"^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(?:to|will|should)\s+\w+")
BULLET_RE = re.compile(r"^\s*(?:[-*+]|\d+[.)])\s*")
CHECKBOX_RE = re.compile(r"^\[[ xX]\]\s*")
DUE_DATE_RE = re.compile(
    r"\b(?:due|by|before)\s+(?:today|tomorrow|eod|friday|monday|tuesday|wednesday|"
    r"thursday|saturday|sunday|\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}(?:/\d{2,4})?)\b",
    re.IGNORECASE,
)


def _clean_line(line: str) -> str:
    cleaned = BULLET_RE.sub("", line.strip())
    cleaned = CHECKBOX_RE.sub("", cleaned)
    return " ".join(cleaned.split())


def _is_action_item(line: str) -> bool:
    if ACTION_PREFIX_RE.match(line):
        return True
    if line.endswith("!"):
        return True
    if ASSIGNEE_RE.match(line):
        return True
    if DUE_DATE_RE.search(line) and ACTION_PHRASE_RE.search(line):
        return True
    return bool(ACTION_PHRASE_RE.search(line))


def extract_action_items(text: str) -> list[str]:
    results: list[str] = []
    seen: set[str] = set()

    for raw_line in text.splitlines():
        line = _clean_line(raw_line)
        if not line or not _is_action_item(line):
            continue

        dedupe_key = line.casefold()
        if dedupe_key in seen:
            continue

        seen.add(dedupe_key)
        results.append(line)

    return results

