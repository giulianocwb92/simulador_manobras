import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.enums import ManeuverAction, ManeuverStatus, ManeuverStepResponsibility


class Maneuver(Base):
    __tablename__ = "maneuvers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    # Número oficial da manobra, formato "0001/2026" — atribuído automaticamente
    # (nunca reatribuído) no primeiro PUT que salva dados reais, ver
    # maneuver_service.assign_number. `unique=True` permite múltiplos NULL
    # (manobras ainda sem número) no Postgres.
    number: Mapped[str | None] = mapped_column(String(20), nullable=True, unique=True)
    status: Mapped[ManeuverStatus] = mapped_column(
        Enum(ManeuverStatus, name="maneuver_status"), nullable=False, default=ManeuverStatus.RASCUNHO
    )
    header_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finalized_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    steps: Mapped[list["ManeuverStep"]] = relationship(
        back_populates="maneuver", cascade="all, delete-orphan", order_by="ManeuverStep.order"
    )
    substations: Mapped[list["ManeuverSubstation"]] = relationship(
        back_populates="maneuver", cascade="all, delete-orphan"
    )

    @property
    def header(self) -> dict:
        return self.header_json

    @property
    def substation_names(self) -> list[str]:
        """Nomes das SEs vinculadas via `ManeuverSubstation` (a fonte real —
        `header["substations"]` é só um campo de texto livre, nunca populado
        automaticamente). Requer `Maneuver.substations` (e o `.substation`
        aninhado) já carregados via `selectinload`, ver api/maneuvers.py."""
        return [ms.substation.name for ms in self.substations if ms.substation is not None]


class ManeuverStep(Base):
    __tablename__ = "maneuver_steps"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    maneuver_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("maneuvers.id"), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)
    equipment_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    action: Mapped[ManeuverAction | None] = mapped_column(Enum(ManeuverAction, name="maneuver_action"), nullable=True)
    responsibility: Mapped[ManeuverStepResponsibility] = mapped_column(
        Enum(ManeuverStepResponsibility, name="maneuver_step_responsibility"),
        nullable=False,
        default=ManeuverStepResponsibility.CENTRO,
        server_default=ManeuverStepResponsibility.CENTRO.value,
    )

    maneuver: Mapped["Maneuver"] = relationship(back_populates="steps")


class ManeuverSubstation(Base):
    __tablename__ = "maneuver_substations"

    maneuver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("maneuvers.id"), primary_key=True
    )
    substation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("substations.id"), primary_key=True
    )
    substation_version: Mapped[int] = mapped_column(Integer, nullable=False)

    maneuver: Mapped["Maneuver"] = relationship(back_populates="substations")
    substation: Mapped["Substation"] = relationship()
