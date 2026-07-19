import uuid

from sqlalchemy import Boolean, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import ProvisionalElementType


class ProvisionalElement(Base):
    __tablename__ = "provisional_elements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    maneuver_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("maneuvers.id"), nullable=False)
    substation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("substations.id"), nullable=False)
    type: Mapped[ProvisionalElementType] = mapped_column(
        Enum(ProvisionalElementType, name="provisional_element_type"), nullable=False
    )
    properties_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    permanent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    @property
    def properties(self) -> dict:
        return self.properties_json
