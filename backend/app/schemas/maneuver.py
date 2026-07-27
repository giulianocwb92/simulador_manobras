import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ManeuverAction, ManeuverStatus, ManeuverStepResponsibility


class ManeuverHeader(BaseModel):
    # `numero` não existe mais aqui — número oficial agora é `Maneuver.number`,
    # atribuído automaticamente (ver ManeuverRead.number / maneuver_service.assign_number).
    data: date | None = None
    responsavel: str | None = None
    area: str | None = None
    substations: list[str] = Field(default_factory=list)
    descricao_isolamento: str | None = None


class ManeuverStepCreate(BaseModel):
    description: str
    equipment_id: str | None = None
    action: ManeuverAction | None = None
    responsibility: ManeuverStepResponsibility = ManeuverStepResponsibility.CENTRO


class ManeuverStepRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order: int
    description: str
    equipment_id: str | None
    action: ManeuverAction | None
    responsibility: ManeuverStepResponsibility


class ManeuverStepUpdate(BaseModel):
    description: str | None = None
    responsibility: ManeuverStepResponsibility | None = None


class ManeuverStepReorder(BaseModel):
    order: list[uuid.UUID]


class ManeuverCreate(BaseModel):
    title: str
    header: ManeuverHeader = Field(default_factory=ManeuverHeader)
    created_by: uuid.UUID | None = None
    # SE(s) envolvidas na manobra (1 para SE única, 2 quando a gravação carregou uma
    # 2ª SE no canvas — ver editorStore.secondarySubstation). Cada uma é vinculada à
    # sua versão atual no momento da criação (ManeuverSubstation.substation_version).
    substation_ids: list[uuid.UUID] = Field(default_factory=list)


class ManeuverUpdate(BaseModel):
    title: str | None = None
    header: ManeuverHeader | None = None
    status: ManeuverStatus | None = None


class ManeuverRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    number: str | None
    status: ManeuverStatus
    header: ManeuverHeader
    # Nomes reais das SEs vinculadas (via ManeuverSubstation) — ver
    # Maneuver.substation_names. `header.substations` é só texto livre, nunca
    # populado automaticamente; não usar pra exibição.
    substation_names: list[str]
    steps: list[ManeuverStepRead]
    created_by: uuid.UUID | None
    created_at: datetime
    finalized_at: datetime | None
