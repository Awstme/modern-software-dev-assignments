from backend.app.services.extract import extract_action_items


def test_extract_action_items():
    text = """
    This is a note
    - TODO: write tests
    - ACTION: review PR
    - Ship it!
    Not actionable
    """.strip()
    items = extract_action_items(text)
    assert "TODO: write tests" in items
    assert "ACTION: review PR" in items
    assert "Ship it!" in items


def test_extract_action_items_recognizes_common_patterns():
    text = """
    Meeting notes:
    - [ ] Please send the recap by Friday
    * follow-up: confirm database migration owner
    1. Need to update API docs due 2026-05-30
    Sarah should review the PR
    This line only describes context
    """.strip()

    items = extract_action_items(text)

    assert items == [
        "Please send the recap by Friday",
        "follow-up: confirm database migration owner",
        "Need to update API docs due 2026-05-30",
        "Sarah should review the PR",
    ]


def test_extract_action_items_deduplicates_case_insensitively():
    text = """
    TODO: write tests
    - todo: write tests
    * TODO: write tests
    """.strip()

    assert extract_action_items(text) == ["TODO: write tests"]

