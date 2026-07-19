import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ManeuverAction, ManeuverStatus, ManeuverStepOrigin


class ManeuverHeader(BaseModel):
    numero: str | None = None
    data: date | None = None
    responsavel: str | None = None
    area: str | None = None
    substations: list[str] = Field(default_factory=list)
    descricao_isolamento: str | None = None


class ManeuverStepCreate(BaseModel):
    description: str
    equipment_id: str | None = None
    action: ManeuverAction | None = None
    origin: ManeuverStepOrigin = ManeuverStepOrigin.MANUAL


class ManeuverStepRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order: int
    description: str
    equipment_id: str | None
    action: ManeuverAction | None
    origin: ManeuverStepOrigin


class ManeuverStepReorder(BaseModel):
    order: list[uuid.UUID]


class ManeuverCreate(BaseModel):
    title: str
    header: ManeuverHeader = Field(default_factory=ManeuverHeader)


class ManeuverUpdate(BaseModel):
    title: str | None = None
    header: ManeuverHeader | None = None
    status: ManeuverStatus | None = None


class ManeuverRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    status: ManeuverStatus
    header: ManeuverHeader
    steps: list[ManeuverStepRead]
    created_by: uuid.UUID | None
    created_at: datetime
    finalized_at: datetime | None
