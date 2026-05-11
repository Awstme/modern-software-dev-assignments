from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import ActionItem, Note, get_db
from ..schemas import (
    ActionItemBrief,
    ActionItemDetail,
    ActionItemExtract,
    ActionItemMarkDone,
    ExtractResponse,
)
from ..services.extract import extract_action_items, extract_action_items_llm

router = APIRouter(prefix="/action-items", tags=["action-items"])


@router.post("/extract", response_model=ExtractResponse)
def extract(
    payload: ActionItemExtract, db: Session = Depends(get_db)
) -> ExtractResponse:
    note_id: int | None = None
    if payload.save_note:
        note = Note(content=payload.text)
        db.add(note)
        db.flush()
        note_id = note.id

    items = extract_action_items(payload.text)
    created: list[ActionItemBrief] = []
    for text in items:
        action_item = ActionItem(note_id=note_id, text=text)
        db.add(action_item)
        db.flush()
        created.append(ActionItemBrief(id=action_item.id, text=action_item.text))

    db.commit()
    return ExtractResponse(note_id=note_id, items=created)


@router.post("/extract-llm", response_model=ExtractResponse)
def extract_llm(
    payload: ActionItemExtract, db: Session = Depends(get_db)
) -> ExtractResponse:
    note_id: int | None = None
    if payload.save_note:
        note = Note(content=payload.text)
        db.add(note)
        db.flush()
        note_id = note.id

    items = extract_action_items_llm(payload.text)
    created: list[ActionItemBrief] = []
    for text in items:
        action_item = ActionItem(note_id=note_id, text=text)
        db.add(action_item)
        db.flush()
        created.append(ActionItemBrief(id=action_item.id, text=action_item.text))

    db.commit()
    return ExtractResponse(note_id=note_id, items=created)


@router.get("", response_model=list[ActionItemDetail])
def list_all(
    note_id: int | None = None, db: Session = Depends(get_db)
) -> list[ActionItemDetail]:
    query = db.query(ActionItem)
    if note_id is not None:
        query = query.filter(ActionItem.note_id == note_id)
    rows = query.order_by(ActionItem.id.desc()).all()
    return [
        ActionItemDetail(
            id=r.id,
            note_id=r.note_id,
            text=r.text,
            done=bool(r.done),
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.post("/{action_item_id}/done")
def mark_done(
    action_item_id: int, payload: ActionItemMarkDone, db: Session = Depends(get_db)
) -> ActionItemDetail:
    item = db.get(ActionItem, action_item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="action item not found")
    item.done = 1 if payload.done else 0
    db.commit()
    db.refresh(item)
    return ActionItemDetail(
        id=item.id,
        note_id=item.note_id,
        text=item.text,
        done=bool(item.done),
        created_at=item.created_at,
    )
