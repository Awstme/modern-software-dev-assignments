from __future__ import annotations

from pydantic import BaseModel, Field

# --- Request Schemas ---


class NoteCreate(BaseModel):
    content: str = Field(..., min_length=1, description="会议笔记内容")


class ActionItemExtract(BaseModel):
    text: str = Field(..., min_length=1, description="待提取的文本")
    save_note: bool = Field(False, description="是否同时保存为笔记")


class ActionItemMarkDone(BaseModel):
    done: bool = Field(True, description="标记完成状态")


# --- Response Schemas ---


class NoteResponse(BaseModel):
    id: int
    content: str
    created_at: str


class ActionItemBrief(BaseModel):
    id: int
    text: str


class ActionItemDetail(BaseModel):
    id: int
    note_id: int | None = None
    text: str
    done: bool
    created_at: str


class ExtractResponse(BaseModel):
    note_id: int | None = None
    items: list[ActionItemBrief]


class MessageResponse(BaseModel):
    detail: str
