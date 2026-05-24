from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import ActionItem
from ..schemas import ActionItemBulkComplete, ActionItemCreate, ActionItemRead

router = APIRouter(prefix="/action-items", tags=["action_items"])


@router.get("/", response_model=list[ActionItemRead])
def list_items(
    completed: bool | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[ActionItemRead]:
    statement = select(ActionItem)
    if completed is not None:
        statement = statement.where(ActionItem.completed.is_(completed))

    rows = db.execute(statement).scalars().all()
    return [ActionItemRead.model_validate(row) for row in rows]


@router.post("/", response_model=ActionItemRead, status_code=201)
def create_item(payload: ActionItemCreate, db: Session = Depends(get_db)) -> ActionItemRead:
    item = ActionItem(description=payload.description, completed=False)
    db.add(item)
    db.flush()
    db.refresh(item)
    return ActionItemRead.model_validate(item)


@router.post("/bulk-complete", response_model=list[ActionItemRead])
def bulk_complete_items(
    payload: ActionItemBulkComplete,
    db: Session = Depends(get_db),
) -> list[ActionItemRead]:
    ids = payload.root
    if not ids:
        raise HTTPException(status_code=400, detail="At least one action item ID is required")

    invalid_ids = [item_id for item_id in ids if item_id <= 0]
    if invalid_ids:
        raise HTTPException(status_code=400, detail={"invalid_ids": invalid_ids})

    unique_ids = list(dict.fromkeys(ids))
    rows = db.execute(select(ActionItem).where(ActionItem.id.in_(unique_ids))).scalars().all()
    items_by_id = {item.id: item for item in rows}
    missing_ids = [item_id for item_id in unique_ids if item_id not in items_by_id]
    if missing_ids:
        raise HTTPException(status_code=404, detail={"missing_ids": missing_ids})

    try:
        for item in items_by_id.values():
            item.completed = True
            db.add(item)
        db.flush()
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to bulk complete action items") from exc

    return [ActionItemRead.model_validate(items_by_id[item_id]) for item_id in unique_ids]


@router.put("/{item_id}/complete", response_model=ActionItemRead)
def complete_item(item_id: int, db: Session = Depends(get_db)) -> ActionItemRead:
    item = db.get(ActionItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Action item not found")
    item.completed = True
    db.add(item)
    db.flush()
    db.refresh(item)
    return ActionItemRead.model_validate(item)
