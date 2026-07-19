import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.substation import Substation, SubstationVersion
from app.schemas.substation import (
    LockRequest,
    SubstationCreate,
    SubstationRead,
    SubstationUpdate,
    SubstationVersionRead,
)
from app.services import substation_service
from app.services.lock_service import LockedError, NotLockedError, acquire_lock, assert_lock_owned, release_lock

router = APIRouter(prefix="/substations", tags=["substations"])


def _locked_error_detail(exc: LockedError) -> dict:
    return {
        "message": "Subestação travada por outro usuário",
        "locked_by": str(exc.locked_by),
        "locked_by_name": exc.locked_by_name,
        "locked_at": exc.locked_at.isoformat() if exc.locked_at else None,
    }


async def _get_substation_or_404(db: AsyncSession, substation_id: uuid.UUID) -> Substation:
    result = await db.execute(
        select(Substation).where(Substation.id == substation_id).options(selectinload(Substation.locked_by_user))
    )
    substation = result.scalar_one_or_none()
    if substation is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subestação não encontrada")
    return await substation_service.release_expired_lock(db, substation)


@router.get("", response_model=list[SubstationRead])
async def list_substations(db: AsyncSession = Depends(get_db)) -> list[Substation]:
    result = await db.execute(select(Substation).options(selectinload(Substation.locked_by_user)).order_by(Substation.name))
    return list(result.scalars().all())


@router.post("", response_model=SubstationRead, status_code=status.HTTP_201_CREATED)
async def create_substation(payload: SubstationCreate, db: AsyncSession = Depends(get_db)) -> Substation:
    substation = Substation(
        name=payload.name,
        sigla=payload.sigla,
        topology_json=payload.topology.model_dump(),
    )
    db.add(substation)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Já existe uma subestação com esta sigla") from exc
    return await _get_substation_or_404(db, substation.id)


@router.get("/{substation_id}", response_model=SubstationRead)
async def get_substation(substation_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> Substation:
    return await _get_substation_or_404(db, substation_id)


@router.put("/{substation_id}", response_model=SubstationRead)
async def update_substation(
    substation_id: uuid.UUID, payload: SubstationUpdate, db: AsyncSession = Depends(get_db)
) -> Substation:
    substation = await _get_substation_or_404(db, substation_id)
    try:
        assert_lock_owned(substation, payload.user_id)
    except NotLockedError as exc:
        raise HTTPException(status.HTTP_423_LOCKED, str(exc)) from exc
    except LockedError as exc:
        raise HTTPException(status.HTTP_423_LOCKED, _locked_error_detail(exc)) from exc

    return await substation_service.save_topology(db, substation, payload.topology, payload.user_id)


@router.get("/{substation_id}/versions", response_model=list[SubstationVersionRead])
async def list_versions(substation_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> list[SubstationVersion]:
    await _get_substation_or_404(db, substation_id)
    result = await db.execute(
        select(SubstationVersion)
        .where(SubstationVersion.substation_id == substation_id)
        .order_by(SubstationVersion.version)
    )
    return list(result.scalars().all())


@router.get("/{substation_id}/versions/{version}", response_model=SubstationVersionRead)
async def get_version(substation_id: uuid.UUID, version: int, db: AsyncSession = Depends(get_db)) -> SubstationVersion:
    await _get_substation_or_404(db, substation_id)
    result = await db.execute(
        select(SubstationVersion).where(
            SubstationVersion.substation_id == substation_id, SubstationVersion.version == version
        )
    )
    substation_version = result.scalar_one_or_none()
    if substation_version is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Versão não encontrada")
    return substation_version


@router.post("/{substation_id}/lock", response_model=SubstationRead)
async def lock_substation(
    substation_id: uuid.UUID, payload: LockRequest, db: AsyncSession = Depends(get_db)
) -> Substation:
    substation = await _get_substation_or_404(db, substation_id)
    try:
        return await acquire_lock(db, substation, payload.user_id)
    except LockedError as exc:
        raise HTTPException(status.HTTP_423_LOCKED, _locked_error_detail(exc)) from exc


@router.delete("/{substation_id}/lock", response_model=SubstationRead)
async def unlock_substation(
    substation_id: uuid.UUID, payload: LockRequest, db: AsyncSession = Depends(get_db)
) -> Substation:
    substation = await _get_substation_or_404(db, substation_id)
    try:
        return await release_lock(db, substation, payload.user_id)
    except LockedError as exc:
        raise HTTPException(status.HTTP_423_LOCKED, _locked_error_detail(exc)) from exc
