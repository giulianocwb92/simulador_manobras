import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.substation import Substation, SubstationVersion
from app.schemas.substation import Topology
from app.services.lock_service import is_lock_expired


async def release_expired_lock(db: AsyncSession, substation: Substation) -> Substation:
    """Se o lock expirou (30min de inatividade), libera automaticamente ao ler a SE."""
    if substation.locked_by is not None and is_lock_expired(substation.locked_at, datetime.now(timezone.utc)):
        substation.locked_by = None
        substation.locked_at = None
        await db.commit()
        await db.refresh(substation)
    return substation


async def save_topology(
    db: AsyncSession, substation: Substation, topology: Topology, user_id: uuid.UUID
) -> Substation:
    """Preserva a versão atual em substation_versions antes de sobrescrever a topologia."""
    previous_version = SubstationVersion(
        substation_id=substation.id,
        topology_json=substation.topology_json,
        version=substation.version,
        saved_by=user_id,
    )
    db.add(previous_version)

    substation.topology_json = topology.model_dump()
    substation.version += 1
    await db.commit()
    await db.refresh(substation)
    return substation
