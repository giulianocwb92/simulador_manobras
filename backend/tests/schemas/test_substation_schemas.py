import uuid

import pytest
from pydantic import ValidationError

from app.schemas.substation import LockRequest, SubstationCreate, Topology


def test_substation_create_usa_topology_vazia_por_padrao():
    payload = SubstationCreate(name="SE Curitiba Batel", sigla="SE-CTB")
    assert payload.topology.nodes == []
    assert payload.topology.edges == []


def test_substation_create_aceita_topology_com_nos_e_arestas():
    payload = SubstationCreate(
        name="SE Curitiba Batel",
        sigla="SE-CTB",
        topology=Topology(nodes=[{"id": "dj-01", "type": "disjuntor"}], edges=[]),
    )
    assert payload.topology.nodes[0]["id"] == "dj-01"


def test_substation_create_falha_sem_campo_obrigatorio():
    with pytest.raises(ValidationError):
        SubstationCreate(sigla="SE-CTB")  # falta name


def test_lock_request_exige_uuid_valido():
    with pytest.raises(ValidationError):
        LockRequest(user_id="não-é-um-uuid")


def test_lock_request_aceita_uuid_valido():
    user_id = uuid.uuid4()
    payload = LockRequest(user_id=user_id)
    assert payload.user_id == user_id
