from backend.app.services.extract import extract_action_items, extract_tags


def test_extract_action_items():
    text = """
    This is a note
    - TODO: write tests
    - Ship it!
    Not actionable
    """.strip()
    items = extract_action_items(text)
    assert "TODO: write tests" in items
    assert "Ship it!" in items


def test_extract_tags_deduplicates_in_order():
    text = "TODO: ship dashboard #frontend #urgent\nFollow up #urgent #qa-check"

    tags = extract_tags(text)

    assert tags == ["frontend", "urgent", "qa-check"]
