import type { CSSProperties } from "react";
import type { Rotation } from "../types/topology";

/**
 * Posição do label de uma barra: sempre acima, texto horizontal, igual pra
 * qualquer rotação — a barra (vertical em 0°/180°, horizontal em 90°/270°,
 * ver getBarraHandlePosition) já tem semântica de orientação própria e
 * diferente da dos equipamentos, então mantém posição fixa aqui.
 */
export const LABEL_POSITION: CSSProperties = {
  bottom: "100%",
  left: "50%",
  transform: "translateX(-50%)",
  marginBottom: 4,
};

/**
 * Posição do label de um equipamento (DJ/CH/TF/religador/TP/TC/provisórios),
 * relativa à rotação: acima quando o componente está deitado (0°/180°) —
 * colado no símbolo, já que a caixa do container acompanha a pegada visual
 * real do símbolo rotacionado (ver useNodeRotation.ts) e não sobra mais
 * overflow pra cobrir com margem grande; à esquerda quando está em pé
 * (90°/270°), onde "acima" ficaria por cima do próprio símbolo.
 */
export function getEquipmentLabelPosition(rotation: Rotation = 0): CSSProperties {
  const isSideways = rotation === 90 || rotation === 270;
  if (isSideways) {
    return {
      right: "100%",
      top: "50%",
      transform: "translateY(-50%)",
      marginRight: 4,
    };
  }
  return {
    bottom: "100%",
    left: "50%",
    transform: "translateX(-50%)",
    marginBottom: 4,
  };
}
