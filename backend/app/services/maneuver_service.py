import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import ManeuverStatus
from app.models.maneuver import Maneuver, ManeuverStep, ManeuverSubstation
from app.models.substation import Substation
from app.schemas.maneuver import ManeuverCreate, ManeuverHeader, ManeuverStepCreate


class ManeuverFinalizedError(Exception):
    """Levantado ao tentar editar (passos, cabeçalho, deletar) uma manobra já FINALIZADA."""


def assert_editable(maneuver: Maneuver) -> None:
    if maneuver.status == ManeuverStatus.FINALIZADA:
        raise ManeuverFinalizedError("Manobra finalizada não pode mais ser editada")


async def create_maneuver(db: AsyncSession, payload: ManeuverCreate) -> Maneuver:
    maneuver = Maneuver(
        title=payload.title,
        header_json=payload.header.model_dump(mode="json"),
        created_by=payload.created_by,
    )
    db.add(maneuver)
    await db.flush()

    for substation_id in payload.substation_ids:
        substation = await db.get(Substation, substation_id)
        if substation is None:
            continue
        db.add(ManeuverSubstation(maneuver_id=maneuver.id, substation_id=substation.id, substation_version=substation.version))

    await db.commit()
    await db.refresh(maneuver)
    return maneuver


async def update_header(db: AsyncSession, maneuver: Maneuver, header: ManeuverHeader) -> Maneuver:
    assert_editable(maneuver)
    maneuver.header_json = header.model_dump(mode="json")
    await db.commit()
    await db.refresh(maneuver)
    return maneuver


async def add_step(db: AsyncSession, maneuver: Maneuver, payload: ManeuverStepCreate) -> ManeuverStep:
    assert_editable(maneuver)
    # order é sempre "no fim" — reordenar de verdade é feito via reorder_steps,
    # que reatribui todos os `order` de uma vez a partir da lista completa.
    next_order = len(maneuver.steps) + 1
    step = ManeuverStep(
        maneuver_id=maneuver.id,
        order=next_order,
        description=payload.description,
        equipment_id=payload.equipment_id,
        action=payload.action,
        origin=payload.origin,
    )
    db.add(step)
    await db.commit()
    await db.refresh(step)
    return step


async def update_step(db: AsyncSession, maneuver: Maneuver, step: ManeuverStep, description: str) -> ManeuverStep:
    assert_editable(maneuver)
    step.description = description
    await db.commit()
    await db.refresh(step)
    return step


async def delete_step(db: AsyncSession, maneuver: Maneuver, step: ManeuverStep) -> None:
    assert_editable(maneuver)
    # Calcula a nova ordem ANTES de deletar/commitar — evitar reler
    # `maneuver.steps` depois do commit, que expira os atributos carregados e
    # exigiria um lazy-load implícito (não suportado em AsyncSession fora de
    # `refresh`/`selectinload`).
    remaining = [s for s in sorted(maneuver.steps, key=lambda s: s.order) if s.id != step.id]
    await db.delete(step)
    for index, s in enumerate(remaining, start=1):
        s.order = index
    await db.commit()


async def reorder_steps(db: AsyncSession, maneuver: Maneuver, ordered_ids: list[uuid.UUID]) -> list[ManeuverStep]:
    assert_editable(maneuver)
    steps_by_id = {step.id: step for step in maneuver.steps}
    for index, step_id in enumerate(ordered_ids, start=1):
        step = steps_by_id.get(step_id)
        if step is not None:
            step.order = index
    await db.commit()
    await db.refresh(maneuver)
    return sorted(maneuver.steps, key=lambda s: s.order)


async def finalize(db: AsyncSession, maneuver: Maneuver) -> Maneuver:
    assert_editable(maneuver)
    maneuver.status = ManeuverStatus.FINALIZADA
    maneuver.finalized_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(maneuver)
    return maneuver
