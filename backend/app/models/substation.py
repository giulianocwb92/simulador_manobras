import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Substation(Base):
    __tablename__ = "substations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sigla: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    topology_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    locked_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    locked_by_user: Mapped["User"] = relationship(foreign_keys=[locked_by])
    versions: Mapped[list["SubstationVersion"]] = relationship(
        back_populates="substation", cascade="all, delete-orphan", order_by="SubstationVersion.version"
    )

    @property
    def topology(self) -> dict:
        return self.topology_json

    @property
    def locked_by_name(self) -> str | None:
        return self.locked_by_user.name if self.locked_by_user else None


class SubstationVersion(Base):
    __tablename__ = "substation_versions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    substation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("substations.id"), nullable=False
    )
    topology_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    saved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    saved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )

    substation: Mapped["Substation"] = relationship(back_populates="versions")

    @property
    def topology(self) -> dict:
        return self.topology_json
