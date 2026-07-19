import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class Topology(BaseModel):
    nodes: list[dict[str, Any]] = Field(default_factory=list)
    edges: list[dict[str, Any]] = Field(default_factory=list)


class SubstationCreate(BaseModel):
    name: str
    sigla: str
    topology: Topology = Field(default_factory=Topology)


class SubstationUpdate(BaseModel):
    user_id: uuid.UUID
    topology: Topology


class SubstationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    sigla: str
    topology: Topology
    version: int
    locked_by: uuid.UUID | None
    locked_by_name: str | None
    locked_at: datetime | None
    created_at: datetime


class SubstationVersionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    substation_id: uuid.UUID
    topology: Topology
    version: int
    saved_at: datetime
    saved_by: uuid.UUID | None


class LockRequest(BaseModel):
    user_id: uuid.UUID
