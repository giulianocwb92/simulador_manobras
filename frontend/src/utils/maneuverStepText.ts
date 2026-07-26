import type { ManeuverAction } from "../types/maneuver";
import type { EquipmentKind } from "../types/topology";

/** Equipamentos que geram passo de manobra ao clicar durante o modo GRAVANDO. */
export const TOGGLEABLE_KINDS: ReadonlySet<EquipmentKind> = new Set(["disjuntor", "chave", "religador"]);

/** Texto gerado por ação, ver tabela em docs/domain-model.md. */
export function generateStepDescription(kind: EquipmentKind, label: string, acao: ManeuverAction): string | null {
  const verbo = acao === "ABRIR" ? "Abrir" : "Fechar";
  switch (kind) {
    case "disjuntor":
      return `${verbo} ${label} — verificar indicação de ${acao === "ABRIR" ? "aberto" : "fechado"} no painel`;
    case "chave":
      return `${verbo} ${label} — verificar posição ${acao === "ABRIR" ? "aberta" : "fechada"}`;
    case "religador":
      return `${verbo} ${label} — verificar indicação de ${acao === "ABRIR" ? "aberto" : "fechado"}`;
    default:
      return null;
  }
}
