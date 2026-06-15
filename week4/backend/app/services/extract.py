import re

TAG_PATTERN = re.compile(r"(?<!\w)#([A-Za-z0-9_-]+)")


def extract_action_items(text: str) -> list[str]:
    lines = [line.strip("- ") for line in text.splitlines() if line.strip()]
    return [line for line in lines if line.endswith("!") or line.lower().startswith("todo:")]


def extract_tags(text: str) -> list[str]:
    tags = TAG_PATTERN.findall(text)
    return sorted(set(tags), key=tags.index)
