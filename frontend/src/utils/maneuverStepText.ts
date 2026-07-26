import type { ManeuverAction } from "../types/maneuver";
import type { EquipmentKind } from "../types/topology";

/** Equipamentos que geram passo de manobra ao clicar durante o modo GRAVANDO. */
export const TOGGLEABLE_KINDS: ReadonlySet<EquipmentKind> = new Set(["disjuntor", "chave", "religador"]);

/**
 * Texto gerado por ação, ver tabela em docs/domain-model.md.
 *
 * `siglaSe`: quando a manobra envolve 2 subestações (ver
 * editorStore.secondarySubstation), cada passo é prefixado com a sigla da SE
 * de origem do equipamento — sem isso, "Abrir DJ 52-01" fica ambíguo se as
 * duas SEs tiverem numeração de equipamento parecida. Omitido (undefined)
 * numa manobra de SE única, onde o prefixo só adicionaria ruído.
 */
export function generateStepDescription(
  kind: EquipmentKind,
  label: string,
  acao: ManeuverAction,
  siglaSe?: string
): string | null {
  const verbo = acao === "ABRIR" ? "Abrir" : "Fechar";
  const prefixo = siglaSe ? `[${siglaSe}] ` : "";
  switch (kind) {
    case "disjuntor":
      return `${prefixo}${verbo} ${label} — verificar indicação de ${acao === "ABRIR" ? "aberto" : "fechado"} no painel`;
    case "chave":
      return `${prefixo}${verbo} ${label} — verificar posição ${acao === "ABRIR" ? "aberta" : "fechada"}`;
    case "religador":
      return `${prefixo}${verbo} ${label} — verificar indicação de ${acao === "ABRIR" ? "aberto" : "fechado"}`;
    default:
      return null;
  }
}
