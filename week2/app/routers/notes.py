from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import Note, get_db
from ..schemas import NoteCreate, NoteResponse

router = APIRouter(prefix="/notes", tags=["notes"])


@router.post("", response_model=NoteResponse, status_code=201)
def create_note(payload: NoteCreate, db: Session = Depends(get_db)) -> NoteResponse:
    note = Note(content=payload.content)
    db.add(note)
    db.commit()
    db.refresh(note)
    return NoteResponse(id=note.id, content=note.content, created_at=note.created_at)


@router.get("/{note_id}", response_model=NoteResponse)
def get_single_note(note_id: int, db: Session = Depends(get_db)) -> NoteResponse:
    note = db.get(Note, note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="note not found")
    return NoteResponse(id=note.id, content=note.content, created_at=note.created_at)


@router.get("", response_model=list[NoteResponse])
def list_notes(db: Session = Depends(get_db)) -> list[NoteResponse]:
    notes = db.query(Note).order_by(Note.id.desc()).all()
    return [NoteResponse(id=n.id, content=n.content, created_at=n.created_at) for n in notes]
