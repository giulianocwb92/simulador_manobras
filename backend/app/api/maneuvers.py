import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.enums import ManeuverStatus
from app.models.maneuver import Maneuver, ManeuverStep, ManeuverSubstation
from app.schemas.maneuver import (
    ManeuverCreate,
    ManeuverRead,
    ManeuverStepCreate,
    ManeuverStepRead,
    ManeuverStepReorder,
    ManeuverStepUpdate,
    ManeuverUpdate,
)
from app.services import maneuver_service
from app.services.maneuver_service import ManeuverFinalizedError

router = APIRouter(prefix="/maneuvers", tags=["maneuvers"])


async def _get_maneuver_or_404(db: AsyncSession, maneuver_id: uuid.UUID) -> Maneuver:
    result = await db.execute(
        select(Maneuver)
        .where(Maneuver.id == maneuver_id)
        .options(
            selectinload(Maneuver.steps),
            selectinload(Maneuver.substations).selectinload(ManeuverSubstation.substation),
        )
    )
    maneuver = result.scalar_one_or_none()
    if maneuver is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Manobra não encontrada")
    return maneuver


def _get_step_or_404(maneuver: Maneuver, step_id: uuid.UUID) -> ManeuverStep:
    step = next((s for s in maneuver.steps if s.id == step_id), None)
    if step is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Passo não encontrado")
    return step


@router.get("", response_model=list[ManeuverRead])
async def list_maneuvers(
    se_id: uuid.UUID | None = Query(None, alias="se_id"),
    user_id: uuid.UUID | None = None,
    status_filter: ManeuverStatus | None = Query(None, alias="status"),
    responsavel: str | None = None,
    data_inicio: date | None = None,
    data_fim: date | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[Maneuver]:
    """Busca por subestação, data (intervalo) e responsável — ver
    docs/domain-model.md "Histórico de manobras"."""
    substation_id = se_id
    query = select(Maneuver).options(
        selectinload(Maneuver.steps),
        selectinload(Maneuver.substations).selectinload(ManeuverSubstation.substation),
    ).order_by(Maneuver.created_at.desc())
    if user_id is not None:
        query = query.where(Maneuver.created_by == user_id)
    if status_filter is not None:
        query = query.where(Maneuver.status == status_filter)
    result = await db.execute(query)
    maneuvers = list(result.scalars().all())
    if substation_id is not None:
        maneuvers = [m for m in maneuvers if any(s.substation_id == substation_id for s in m.substations)]
    if responsavel:
        needle = responsavel.strip().lower()
        maneuvers = [m for m in maneuvers if needle in (m.header.get("responsavel") or "").lower()]
    if data_inicio is not None or data_fim is not None:
        def _in_range(m: Maneuver) -> bool:
            raw = m.header.get("data")
            if not raw:
                return False
            valor = date.fromisoformat(raw)
            if data_inicio is not None and valor < data_inicio:
                return False
            if data_fim is not None and valor > data_fim:
                return False
            return True

        maneuvers = [m for m in maneuvers if _in_range(m)]
    return maneuvers


@router.post("", response_model=ManeuverRead, status_code=status.HTTP_201_CREATED)
async def create_maneuver(payload: ManeuverCreate, db: AsyncSession = Depends(get_db)) -> Maneuver:
    maneuver = await maneuver_service.create_maneuver(db, payload)
    return await _get_maneuver_or_404(db, maneuver.id)


@router.get("/{maneuver_id}", response_model=ManeuverRead)
async def get_maneuver(maneuver_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> Maneuver:
    return await _get_maneuver_or_404(db, maneuver_id)


@router.put("/{maneuver_id}", response_model=ManeuverRead)
async def update_maneuver(
    maneuver_id: uuid.UUID, payload: ManeuverUpdate, db: AsyncSession = Depends(get_db)
) -> Maneuver:
    maneuver = await _get_maneuver_or_404(db, maneuver_id)
    try:
        if payload.header is not None:
            await maneuver_service.update_header(db, maneuver, payload.header)
        if payload.title is not None:
            maneuver_service.assert_editable(maneuver)
            maneuver.title = payload.title
            await db.commit()
        if payload.status == ManeuverStatus.FINALIZADA:
            await maneuver_service.finalize(db, maneuver)
    except ManeuverFinalizedError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    return await _get_maneuver_or_404(db, maneuver_id)


@router.delete("/{maneuver_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_maneuver(maneuver_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> None:
    maneuver = await _get_maneuver_or_404(db, maneuver_id)
    if maneuver.status != ManeuverStatus.RASCUNHO:
        raise HTTPException(status.HTTP_409_CONFLICT, "Só é possível deletar manobras em rascunho")
    await db.delete(maneuver)
    await db.commit()


@router.post("/{maneuver_id}/steps", response_model=ManeuverStepRead, status_code=status.HTTP_201_CREATED)
async def add_step(
    maneuver_id: uuid.UUID, payload: ManeuverStepCreate, db: AsyncSession = Depends(get_db)
) -> ManeuverStep:
    maneuver = await _get_maneuver_or_404(db, maneuver_id)
    try:
        return await maneuver_service.add_step(db, maneuver, payload)
    except ManeuverFinalizedError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc


@router.put("/{maneuver_id}/steps/{step_id}", response_model=ManeuverStepRead)
async def update_step(
    maneuver_id: uuid.UUID, step_id: uuid.UUID, payload: ManeuverStepUpdate, db: AsyncSession = Depends(get_db)
) -> ManeuverStep:
    maneuver = await _get_maneuver_or_404(db, maneuver_id)
    step = _get_step_or_404(maneuver, step_id)
    try:
        return await maneuver_service.update_step(db, maneuver, step, payload.description)
    except ManeuverFinalizedError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc


@router.delete("/{maneuver_id}/steps/{step_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_step(maneuver_id: uuid.UUID, step_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> None:
    maneuver = await _get_maneuver_or_404(db, maneuver_id)
    step = _get_step_or_404(maneuver, step_id)
    try:
        await maneuver_service.delete_step(db, maneuver, step)
    except ManeuverFinalizedError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc


@router.post("/{maneuver_id}/steps/reorder", response_model=list[ManeuverStepRead])
async def reorder_steps(
    maneuver_id: uuid.UUID, payload: ManeuverStepReorder, db: AsyncSession = Depends(get_db)
) -> list[ManeuverStep]:
    maneuver = await _get_maneuver_or_404(db, maneuver_id)
    try:
        return await maneuver_service.reorder_steps(db, maneuver, payload.order)
    except ManeuverFinalizedError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc


@router.post("/{maneuver_id}/finalize", response_model=ManeuverRead)
async def finalize_maneuver(maneuver_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> Maneuver:
    maneuver = await _get_maneuver_or_404(db, maneuver_id)
    try:
        await maneuver_service.finalize(db, maneuver)
    except ManeuverFinalizedError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    return await _get_maneuver_or_404(db, maneuver_id)


@router.post("/{maneuver_id}/clone", response_model=ManeuverRead, status_code=status.HTTP_201_CREATED)
async def clone_maneuver(maneuver_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> Maneuver:
    original = await _get_maneuver_or_404(db, maneuver_id)
    clone = await maneuver_service.clone_maneuver(db, original)
    return await _get_maneuver_or_404(db, clone.id)


@router.get("/{maneuver_id}/pdf")
async def get_maneuver_pdf(maneuver_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> FileResponse:
    maneuver = await _get_maneuver_or_404(db, maneuver_id)
    # Regenera a cada chamada (o conteúdo pode mudar até a manobra ser
    # finalizada) — modelo de template PROVISÓRIO, ver maneuver_service.py.
    pdf_bytes = maneuver_service.render_pdf(maneuver, maneuver.substation_names)
    path = maneuver_service.save_pdf(maneuver.id, pdf_bytes)
    filename = f"manobra-{maneuver.header.get('numero') or maneuver.id}.pdf"
    return FileResponse(path, media_type="application/pdf", filename=filename)
