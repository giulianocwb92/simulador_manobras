import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app.models.substation import Substation
from app.services.lock_service import (
    LockedError,
    NotLockedError,
    assert_lock_owned,
    is_lock_expired,
    is_locked,
)


def _substation(locked_by: uuid.UUID | None = None, locked_at: datetime | None = None) -> Substation:
    substation = Substation(id=uuid.uuid4(), name="SE Teste", sigla="SE-TST")
    substation.locked_by = locked_by
    substation.locked_at = locked_at
    return substation


def test_is_lock_expired_sem_lock_e_considerado_expirado():
    assert is_lock_expired(None) is True


def test_is_lock_expired_dentro_do_prazo_de_30_minutos():
    locked_at = datetime.now(timezone.utc) - timedelta(minutes=10)
    assert is_lock_expired(locked_at) is False


def test_is_lock_expired_apos_30_minutos_de_inatividade():
    locked_at = datetime.now(timezone.utc) - timedelta(minutes=31)
    assert is_lock_expired(locked_at) is True


def test_is_locked_true_quando_travado_dentro_do_prazo():
    substation = _substation(locked_by=uuid.uuid4(), locked_at=datetime.now(timezone.utc))
    assert is_locked(substation) is True


def test_is_locked_false_quando_lock_expirou():
    locked_at = datetime.now(timezone.utc) - timedelta(minutes=31)
    substation = _substation(locked_by=uuid.uuid4(), locked_at=locked_at)
    assert is_locked(substation) is False


def test_is_locked_false_quando_nunca_foi_travada():
    substation = _substation()
    assert is_locked(substation) is False


def test_assert_lock_owned_nao_levanta_erro_quando_dono_edita():
    user_id = uuid.uuid4()
    substation = _substation(locked_by=user_id, locked_at=datetime.now(timezone.utc))
    assert_lock_owned(substation, user_id)


def test_assert_lock_owned_levanta_not_locked_error_sem_lock_ativo():
    substation = _substation()
    with pytest.raises(NotLockedError):
        assert_lock_owned(substation, uuid.uuid4())


def test_assert_lock_owned_levanta_locked_error_para_outro_usuario():
    dono = uuid.uuid4()
    outro = uuid.uuid4()
    substation = _substation(locked_by=dono, locked_at=datetime.now(timezone.utc))
    with pytest.raises(LockedError) as exc_info:
        assert_lock_owned(substation, outro)
    assert exc_info.value.locked_by == dono


def test_assert_lock_owned_trata_lock_expirado_como_nao_travado():
    locked_at = datetime.now(timezone.utc) - timedelta(minutes=45)
    substation = _substation(locked_by=uuid.uuid4(), locked_at=locked_at)
    with pytest.raises(NotLockedError):
        assert_lock_owned(substation, uuid.uuid4())
