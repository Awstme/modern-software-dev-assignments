from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import asc, desc, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import ActionItem, Project
from ..schemas import ActionItemRead, ProjectCreate, ProjectRead

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("/", response_model=list[ProjectRead])
def list_projects(
    db: Session = Depends(get_db),
    q: str | None = None,
    skip: int = 0,
    limit: int = Query(50, le=200),
    sort: str = Query("name"),
) -> list[ProjectRead]:
    stmt = select(Project)
    if q:
        stmt = stmt.where((Project.name.contains(q)) | (Project.description.contains(q)))

    sort_field = sort.lstrip("-")
    order_fn = desc if sort.startswith("-") else asc
    if hasattr(Project, sort_field):
        stmt = stmt.order_by(order_fn(getattr(Project, sort_field)))
    else:
        stmt = stmt.order_by(asc(Project.name))

    rows = db.execute(stmt.offset(skip).limit(limit)).scalars().all()
    return [ProjectRead.model_validate(row) for row in rows]


@router.post("/", response_model=ProjectRead, status_code=201)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)) -> ProjectRead:
    existing = db.execute(select(Project).where(Project.name == payload.name)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Project name already exists")

    project = Project(name=payload.name, description=payload.description)
    db.add(project)
    db.flush()
    db.refresh(project)
    return ProjectRead.model_validate(project)


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(project_id: int, db: Session = Depends(get_db)) -> ProjectRead:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectRead.model_validate(project)


@router.get("/{project_id}/action-items", response_model=list[ActionItemRead])
def list_project_action_items(
    project_id: int,
    db: Session = Depends(get_db),
    completed: bool | None = None,
    skip: int = 0,
    limit: int = Query(50, le=200),
) -> list[ActionItemRead]:
    if db.get(Project, project_id) is None:
        raise HTTPException(status_code=404, detail="Project not found")

    stmt = select(ActionItem).where(ActionItem.project_id == project_id)
    if completed is not None:
        stmt = stmt.where(ActionItem.completed.is_(completed))

    rows = (
        db.execute(stmt.order_by(desc(ActionItem.created_at)).offset(skip).limit(limit))
        .scalars()
        .all()
    )
    return [ActionItemRead.model_validate(row) for row in rows]
