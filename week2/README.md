# Week 2 — Action Item Extractor

A FastAPI + SQLite application that extracts actionable items from meeting notes. It provides two extraction strategies: a **heuristic** extractor (regex/keyword-based) and an **LLM-driven** extractor (via Ollama). A minimal HTML frontend is included.

## Project Structure

```
week2/
├── app/
│   ├── main.py              # FastAPI application entry point
│   ├── config.py             # Settings (pydantic-settings, reads .env)
│   ├── db.py                 # SQLAlchemy ORM models & session management
│   ├── schemas.py            # Pydantic request/response schemas
│   ├── routers/
│   │   ├── notes.py          # /notes endpoints
│   │   └── action_items.py   # /action-items endpoints
│   └── services/
│       └── extract.py        # Heuristic & LLM extraction logic
├── tests/
│   └── test_extract.py       # Unit tests (11 tests)
├── frontend/
│   └── index.html            # Minimal HTML frontend
└── data/
    └── app.db                # SQLite database (auto-created)
```

## Setup

### Prerequisites

- Python 3.10+
- Conda environment `cs146s` (or equivalent with dependencies installed)
- Ollama running locally or remotely with a compatible model (default: `llama3.1:8b`)

### Installation

Dependencies are managed via the `cs146s` conda environment. Key packages:

| Package | Purpose |
|---------|---------|
| `fastapi` | Web framework |
| `uvicorn` | ASGI server |
| `sqlalchemy` | ORM & database |
| `pydantic` | Data validation |
| `pydantic-settings` | Configuration from `.env` |
| `ollama` | LLM client |
| `python-dotenv` | `.env` file loading |

### Configuration

Create a `.env` file in the project root:

```env
OLLAMA_HOST=https://ollama.awstme.top   # Ollama API host
LLM_MODEL=llama3.1:8b                    # Model for LLM extraction
DB_URL=sqlite:///week2/data/app.db       # SQLite database path
```

### Running the Server

```bash
conda activate cs146s
uvicorn week2.app.main:app --reload
```

The server starts at `http://127.0.0.1:8000`. The frontend is available at the root URL `/`.

Interactive API docs are available at `/docs` (Swagger UI) or `/redoc`.

## API Endpoints

### Notes

| Method | Path | Description | Request Body |
|--------|------|-------------|--------------|
| `POST` | `/notes` | Create a new note | `{"content": "string"}` |
| `GET` | `/notes` | List all notes (newest first) | — |
| `GET` | `/notes/{note_id}` | Get a single note by ID | — |

### Action Items

| Method | Path | Description | Request Body |
|--------|------|-------------|--------------|
| `POST` | `/action-items/extract` | Extract action items (heuristic) | `{"text": "string", "save_note": false}` |
| `POST` | `/action-items/extract-llm` | Extract action items (LLM) | `{"text": "string", "save_note": false}` |
| `GET` | `/action-items` | List all action items | `?note_id=<int>` (optional filter) |
| `POST` | `/action-items/{id}/done` | Mark an action item done/undone | `{"done": true}` |

### Example: Extract Action Items

```bash
curl -X POST http://127.0.0.1:8000/action-items/extract \
  -H "Content-Type: application/json" \
  -d '{"text": "- [ ] Set up database\n- Implement API\nDone with meeting.", "save_note": true}'
```

Response:

```json
{
  "note_id": 1,
  "items": [
    {"id": 1, "text": "Set up database"},
    {"id": 2, "text": "Implement API"}
  ]
}
```

### Example: List Notes

```bash
curl http://127.0.0.1:8000/notes
```

Response:

```json
[
  {"id": 1, "content": "- [ ] Set up database\n- Implement API\nDone with meeting.", "created_at": "2026-05-11 14:00:00"}
]
```

## Extraction Strategies

### Heuristic (`extract_action_items`)

Uses regex patterns and keyword matching to identify action items:

- **Bullet prefixes**: `-`, `*`, `•`, `1.`
- **Keyword prefixes**: `TODO:`, `Action:`, `Next:`
- **Checkbox markers**: `[ ]`, `[todo]`
- **Fallback**: Imperative sentences starting with verbs like "add", "create", "fix", etc.

### LLM-driven (`extract_action_items_llm`)

Sends text to an Ollama-hosted LLM with a structured output schema (JSON). The model returns a JSON array of action item strings. Uses `temperature=0` for deterministic results.

## Testing

Run the full test suite:

```bash
conda run -n cs146s python -m pytest week2/tests/test_extract.py -v
```

All 11 tests pass. Tests mock `ollama.chat` to avoid real LLM calls.

Test coverage includes:

| Test | Scenario |
|------|----------|
| `test_extract_bullets_and_checkboxes` | Heuristic: bullet/checkbox list |
| `test_llm_extract_bullets_and_checkboxes` | LLM: bullet/checkbox list |
| `test_llm_extract_keyword_prefixes` | LLM: `todo:`, `action:`, `next:` prefixes |
| `test_llm_extract_empty_input` | LLM: empty string returns `[]` |
| `test_llm_extract_whitespace_only` | LLM: whitespace-only returns `[]` |
| `test_llm_extract_narrative_only` | LLM: no action items in narrative |
| `test_llm_extract_deduplication` | LLM: case-insensitive dedup |
| `test_llm_extract_mixed_content` | LLM: mixed narrative + action items |
| `test_llm_extract_malformed_json` | LLM: graceful fallback on bad JSON |
| `test_llm_extract_missing_action_items_key` | LLM: graceful fallback on unexpected JSON |
| `test_llm_extract_calls_model_with_correct_params` | LLM: verifies model, temp, schema, messages |

## Linting

```bash
conda run -n cs146s ruff check week2/app/
```
