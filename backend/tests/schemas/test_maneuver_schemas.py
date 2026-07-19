import pytest
from pydantic import ValidationError

from app.models.enums import ManeuverAction, ManeuverStepOrigin
from app.schemas.maneuver import ManeuverCreate, ManeuverHeader, ManeuverStepCreate


def test_maneuver_step_create_origem_padrao_e_manual():
    step = ManeuverStepCreate(description="Confirmar ausência de carga no alimentador")
    assert step.origin == ManeuverStepOrigin.MANUAL
    assert step.action is None


def test_maneuver_step_create_aceita_passo_gerado_pelo_simulador():
    step = ManeuverStepCreate(
        description="Abrir DJ 52-01 — verificar indicação de aberto no painel",
        equipment_id="dj-01",
        action=ManeuverAction.ABRIR,
        origin=ManeuverStepOrigin.SIMULADOR,
    )
    assert step.action == ManeuverAction.ABRIR


def test_maneuver_step_create_rejeita_acao_invalida():
    with pytest.raises(ValidationError):
        ManeuverStepCreate(description="passo qualquer", action="INVALIDA")


def test_maneuver_header_aceita_data_iso():
    header = ManeuverHeader(data="2025-01-20")
    assert header.data.isoformat() == "2025-01-20"


def test_maneuver_create_usa_header_vazio_por_padrao():
    maneuver = ManeuverCreate(title="Desligamento TF-01 SE-CTB")
    assert maneuver.header.substations == []
    assert maneuver.header.numero is None
