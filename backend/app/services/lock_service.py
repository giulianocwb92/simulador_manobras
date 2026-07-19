import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.substation import Substation

LOCK_TIMEOUT = timedelta(minutes=30)


class LockedError(Exception):
    """SE travada por outro usuário e o lock ainda não expirou."""

    def __init__(self, locked_by: uuid.UUID, locked_by_name: str | None, locked_at: datetime) -> None:
        self.locked_by = locked_by
        self.locked_by_name = locked_by_name
        self.locked_at = locked_at
        super().__init__(f"Subestação travada por {locked_by_name or locked_by}")


class NotLockedError(Exception):
    """Operação exige lock ativo do usuário, mas a SE não está travada (ou o lock expirou)."""


def is_lock_expired(locked_at: datetime | None, now: datetime | None = None) -> bool:
    if locked_at is None:
        return True
    now = now or datetime.now(timezone.utc)
    return now - locked_at > LOCK_TIMEOUT


def is_locked(substation: Substation, now: datetime | None = None) -> bool:
    return substation.locked_by is not None and not is_lock_expired(substation.locked_at, now)


async def acquire_lock(db: AsyncSession, substation: Substation, user_id: uuid.UUID) -> Substation:
    now = datetime.now(timezone.utc)
    if is_locked(substation, now) and substation.locked_by != user_id:
        raise LockedError(substation.locked_by, substation.locked_by_name, substation.locked_at)

    substation.locked_by = user_id
    substation.locked_at = now
    await db.commit()
    await db.refresh(substation)
    return substation


async def release_lock(db: AsyncSession, substation: Substation, user_id: uuid.UUID) -> Substation:
    now = datetime.now(timezone.utc)
    if is_locked(substation, now) and substation.locked_by != user_id:
        raise LockedError(substation.locked_by, substation.locked_by_name, substation.locked_at)

    substation.locked_by = None
    substation.locked_at = None
    await db.commit()
    await db.refresh(substation)
    return substation


def assert_lock_owned(substation: Substation, user_id: uuid.UUID, now: datetime | None = None) -> None:
    """Levanta erro se a operação (ex: salvar topologia) exigir lock ativo do usuário."""
    if not is_locked(substation, now):
        raise NotLockedError("Subestação precisa estar travada para ser editada")
    if substation.locked_by != user_id:
        raise LockedError(substation.locked_by, substation.locked_by_name, substation.locked_at)
