import json
import os
from unittest.mock import MagicMock, patch

import pytest

from ..app.config import settings
from ..app.services.extract import extract_action_items, extract_action_items_llm


# ---------------------------------------------------------------------------
# Tests for the heuristic extractor (existing)
# ---------------------------------------------------------------------------


def test_extract_bullets_and_checkboxes():
    text = """
    Notes from meeting:
    - [ ] Set up database
    * implement API extract endpoint
    1. Write tests
    Some narrative sentence.
    """.strip()

    items = extract_action_items(text)
    assert "Set up database" in items
    assert "implement API extract endpoint" in items
    assert "Write tests" in items


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _mock_chat_response(action_items: list[str]) -> MagicMock:
    """Build a mock ollama chat response containing *action_items*."""
    resp = MagicMock()
    resp.message.content = json.dumps({"action_items": action_items})
    return resp


# ---------------------------------------------------------------------------
# Tests for the LLM extractor (extract_action_items_llm)
# ---------------------------------------------------------------------------


@patch("week2.app.services.extract.chat")
def test_llm_extract_bullets_and_checkboxes(mock_chat):
    mock_chat.return_value = _mock_chat_response([
        "Set up database",
        "implement API extract endpoint",
        "Write tests",
    ])

    text = """
    Notes from meeting:
    - [ ] Set up database
    * implement API extract endpoint
    1. Write tests
    Some narrative sentence.
    """.strip()

    items = extract_action_items_llm(text)
    assert items == ["Set up database", "implement API extract endpoint", "Write tests"]
    mock_chat.assert_called_once()


@patch("week2.app.services.extract.chat")
def test_llm_extract_keyword_prefixes(mock_chat):
    mock_chat.return_value = _mock_chat_response([
        "Deploy to staging",
        "Review pull request",
        "Send summary email",
    ])

    text = """
    TODO: Deploy to staging
    Action: Review pull request
    Next: Send summary email
    """.strip()

    items = extract_action_items_llm(text)
    assert "Deploy to staging" in items
    assert "Review pull request" in items
    assert "Send summary email" in items


@patch("week2.app.services.extract.chat")
def test_llm_extract_empty_input(mock_chat):
    items = extract_action_items_llm("")
    assert items == []
    mock_chat.assert_not_called()


@patch("week2.app.services.extract.chat")
def test_llm_extract_whitespace_only(mock_chat):
    items = extract_action_items_llm("   \n\t  ")
    assert items == []
    mock_chat.assert_not_called()


@patch("week2.app.services.extract.chat")
def test_llm_extract_narrative_only(mock_chat):
    mock_chat.return_value = _mock_chat_response([])

    text = (
        "We had a productive meeting today. The team discussed the roadmap "
        "and everyone agreed the project is on track."
    )

    items = extract_action_items_llm(text)
    assert items == []


@patch("week2.app.services.extract.chat")
def test_llm_extract_deduplication(mock_chat):
    mock_chat.return_value = _mock_chat_response([
        "Update the README",
        "update the README",
        "Update the README",
    ])

    items = extract_action_items_llm("- Update the README\n- update the README")
    assert items == ["Update the README"]


@patch("week2.app.services.extract.chat")
def test_llm_extract_mixed_content(mock_chat):
    mock_chat.return_value = _mock_chat_response([
        "Fix login bug",
        "Write unit tests",
    ])

    text = """
    The login page has a known issue that needs attention.
    TODO: Fix login bug
    We also need more coverage.
    Action: Write unit tests
    Overall the sprint is going well.
    """.strip()

    items = extract_action_items_llm(text)
    assert items == ["Fix login bug", "Write unit tests"]


@patch("week2.app.services.extract.chat")
def test_llm_extract_malformed_json(mock_chat):
    resp = MagicMock()
    resp.message.content = "not valid json"
    mock_chat.return_value = resp

    items = extract_action_items_llm("some text")
    assert items == []


@patch("week2.app.services.extract.chat")
def test_llm_extract_missing_action_items_key(mock_chat):
    resp = MagicMock()
    resp.message.content = json.dumps({"unexpected": "structure"})
    mock_chat.return_value = resp

    items = extract_action_items_llm("some text")
    assert items == []


@patch("week2.app.services.extract.chat")
def test_llm_extract_calls_model_with_correct_params(mock_chat):
    mock_chat.return_value = _mock_chat_response(["do something"])

    extract_action_items_llm("Get it done")

    call_kwargs = mock_chat.call_args
    assert call_kwargs.kwargs["model"] == settings.llm_model
    assert call_kwargs.kwargs["options"] == {"temperature": 0}
    assert call_kwargs.kwargs["format"] == {
        "type": "object",
        "properties": {
            "action_items": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["action_items"],
    }
    messages = call_kwargs.kwargs["messages"]
    assert messages[0]["role"] == "system"
    assert messages[1]["role"] == "user"
    assert messages[1]["content"] == "Get it done"
