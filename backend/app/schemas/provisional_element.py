import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ProvisionalElementType


class ProvisionalElementCreate(BaseModel):
    maneuver_id: uuid.UUID
    substation_id: uuid.UUID
    type: ProvisionalElementType
    properties: dict[str, Any] = Field(default_factory=dict)
    permanent: bool = False


class ProvisionalElementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    maneuver_id: uuid.UUID
    substation_id: uuid.UUID
    type: ProvisionalElementType
    properties: dict[str, Any]
    permanent: bool
