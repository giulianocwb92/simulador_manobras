import pytest

from app.models.enums import ManeuverStatus
from app.models.maneuver import Maneuver
from app.services.maneuver_service import ManeuverFinalizedError, assert_editable


def _maneuver(status: ManeuverStatus) -> Maneuver:
    maneuver = Maneuver(title="Teste")
    maneuver.status = status
    return maneuver


def test_assert_editable_nao_levanta_erro_para_rascunho():
    assert_editable(_maneuver(ManeuverStatus.RASCUNHO))


def test_assert_editable_levanta_erro_para_manobra_finalizada():
    with pytest.raises(ManeuverFinalizedError):
        assert_editable(_maneuver(ManeuverStatus.FINALIZADA))
