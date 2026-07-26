import base64
import uuid
from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from sqlalchemy.ext.asyncio import AsyncSession
from weasyprint import HTML

from app.core.config import get_settings
from app.models.enums import ManeuverStatus
from app.models.maneuver import Maneuver, ManeuverStep, ManeuverSubstation
from app.models.substation import Substation
from app.schemas.maneuver import ManeuverCreate, ManeuverHeader, ManeuverStepCreate

_APP_DIR = Path(__file__).resolve().parent.parent
_TEMPLATES_DIR = _APP_DIR / "templates"
_STATIC_DIR = _APP_DIR / "static"
_jinja_env = Environment(loader=FileSystemLoader(_TEMPLATES_DIR))


class ManeuverFinalizedError(Exception):
    """Levantado ao tentar editar (passos, cabeçalho, deletar) uma manobra já FINALIZADA."""


def assert_editable(maneuver: Maneuver) -> None:
    if maneuver.status == ManeuverStatus.FINALIZADA:
        raise ManeuverFinalizedError("Manobra finalizada não pode mais ser editada")


async def create_maneuver(db: AsyncSession, payload: ManeuverCreate) -> Maneuver:
    maneuver = Maneuver(
        title=payload.title,
        header_json=payload.header.model_dump(mode="json"),
        created_by=payload.created_by,
    )
    db.add(maneuver)
    await db.flush()

    for substation_id in payload.substation_ids:
        substation = await db.get(Substation, substation_id)
        if substation is None:
            continue
        db.add(ManeuverSubstation(maneuver_id=maneuver.id, substation_id=substation.id, substation_version=substation.version))

    await db.commit()
    await db.refresh(maneuver)
    return maneuver


async def update_header(db: AsyncSession, maneuver: Maneuver, header: ManeuverHeader) -> Maneuver:
    assert_editable(maneuver)
    maneuver.header_json = header.model_dump(mode="json")
    await db.commit()
    await db.refresh(maneuver)
    return maneuver


async def add_step(db: AsyncSession, maneuver: Maneuver, payload: ManeuverStepCreate) -> ManeuverStep:
    assert_editable(maneuver)
    # order é sempre "no fim" — reordenar de verdade é feito via reorder_steps,
    # que reatribui todos os `order` de uma vez a partir da lista completa.
    next_order = len(maneuver.steps) + 1
    step = ManeuverStep(
        maneuver_id=maneuver.id,
        order=next_order,
        description=payload.description,
        equipment_id=payload.equipment_id,
        action=payload.action,
        origin=payload.origin,
    )
    db.add(step)
    await db.commit()
    await db.refresh(step)
    return step


async def update_step(db: AsyncSession, maneuver: Maneuver, step: ManeuverStep, description: str) -> ManeuverStep:
    assert_editable(maneuver)
    step.description = description
    await db.commit()
    await db.refresh(step)
    return step


async def delete_step(db: AsyncSession, maneuver: Maneuver, step: ManeuverStep) -> None:
    assert_editable(maneuver)
    # Calcula a nova ordem ANTES de deletar/commitar — evitar reler
    # `maneuver.steps` depois do commit, que expira os atributos carregados e
    # exigiria um lazy-load implícito (não suportado em AsyncSession fora de
    # `refresh`/`selectinload`).
    remaining = [s for s in sorted(maneuver.steps, key=lambda s: s.order) if s.id != step.id]
    await db.delete(step)
    for index, s in enumerate(remaining, start=1):
        s.order = index
    await db.commit()


async def reorder_steps(db: AsyncSession, maneuver: Maneuver, ordered_ids: list[uuid.UUID]) -> list[ManeuverStep]:
    assert_editable(maneuver)
    steps_by_id = {step.id: step for step in maneuver.steps}
    for index, step_id in enumerate(ordered_ids, start=1):
        step = steps_by_id.get(step_id)
        if step is not None:
            step.order = index
    await db.commit()
    await db.refresh(maneuver)
    return sorted(maneuver.steps, key=lambda s: s.order)


async def finalize(db: AsyncSession, maneuver: Maneuver) -> Maneuver:
    assert_editable(maneuver)
    maneuver.status = ManeuverStatus.FINALIZADA
    maneuver.finalized_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(maneuver)
    return maneuver


async def clone_maneuver(db: AsyncSession, original: Maneuver) -> Maneuver:
    """Cria um novo RASCUNHO com o mesmo cabeçalho e sequência de passos —
    ver docs/domain-model.md "Histórico de manobras". As SEs envolvidas são
    religadas à versão ATUAL de cada uma (não a versão congelada da manobra
    original), já que o clone é um novo trabalho que parte do estado de hoje."""
    clone = Maneuver(
        title=f"Cópia de {original.title}",
        header_json=dict(original.header_json),
        created_by=original.created_by,
    )
    db.add(clone)
    await db.flush()

    for step in sorted(original.steps, key=lambda s: s.order):
        db.add(
            ManeuverStep(
                maneuver_id=clone.id,
                order=step.order,
                description=step.description,
                equipment_id=step.equipment_id,
                action=step.action,
                origin=step.origin,
            )
        )

    for ms in original.substations:
        substation = await db.get(Substation, ms.substation_id)
        if substation is None:
            continue
        db.add(ManeuverSubstation(maneuver_id=clone.id, substation_id=substation.id, substation_version=substation.version))

    await db.commit()
    await db.refresh(clone)
    return clone


def _logo_data_uri() -> str | None:
    """Embute o logo como data URI (em vez de referenciar o arquivo por caminho)
    pra não depender de `base_url`/permissões de arquivo na hora do WeasyPrint
    resolver a imagem."""
    logo_path = _STATIC_DIR / "copel-logo.png"
    if not logo_path.exists():
        return None
    encoded = base64.b64encode(logo_path.read_bytes()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def build_pdf_context(maneuver: Maneuver, substation_names: list[str]) -> dict:
    """Monta o contexto do template a partir da manobra — ver
    backend/app/templates/maneuver.html (modelo PROVISÓRIO, aguardando o
    template oficial, ver docs/implementation-plan.md FASE 8)."""
    header = maneuver.header
    return {
        "titulo": maneuver.title,
        "numero": header.get("numero"),
        "data": header.get("data"),
        "responsavel": header.get("responsavel"),
        "area": header.get("area"),
        "substations": substation_names or header.get("substations") or [],
        "descricao_isolamento": header.get("descricao_isolamento"),
        "steps": [
            {
                "order": step.order,
                "description": step.description,
                "action": step.action.value if step.action else None,
                "origin": step.origin.value,
            }
            for step in sorted(maneuver.steps, key=lambda s: s.order)
        ],
        "logo_data_uri": _logo_data_uri(),
        "gerado_em": datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC"),
    }


def render_pdf(maneuver: Maneuver, substation_names: list[str]) -> bytes:
    template = _jinja_env.get_template("maneuver.html")
    html_content = template.render(**build_pdf_context(maneuver, substation_names))
    return HTML(string=html_content, base_url=str(_TEMPLATES_DIR)).write_pdf()


def save_pdf(maneuver_id: uuid.UUID, pdf_bytes: bytes) -> Path:
    pdf_dir = Path(get_settings().storage_path) / "pdfs"
    pdf_dir.mkdir(parents=True, exist_ok=True)
    path = pdf_dir / f"{maneuver_id}.pdf"
    path.write_bytes(pdf_bytes)
    return path
