import type { ReactNode } from "react";
import { Handle } from "@xyflow/react";
import type { EquipmentKind, Rotation } from "../types/topology";
import { getTerminalPosition } from "../utils/edgePositions";
import { useNodeRotation } from "./useNodeRotation";

interface EquipmentNodeShellProps {
  id: string;
  kind: EquipmentKind;
  rotation: Rotation;
  selected?: boolean;
  baseWidth: number;
  baseHeight: number;
  /** Conteúdo do símbolo (o `<svg>`), colocado dentro do wrapper rotacionado. */
  children: ReactNode;
  /** Label do equipamento — cada tipo tem estilo/título/sufixo próprios, ver
   *  cada *Node.tsx, então fica de fora da generalização. */
  label: ReactNode;
  /** Elementos extras fora do wrapper rotacionado (ex.: tensão AT/BT do TFNode). */
  extra?: ReactNode;
}

/**
 * Container/handles/wrapper compartilhados pelos equipamentos de 2 terminais
 * fixos (DJ/CH/Religador/TF/TC/Jumper/ChaveProvisória) — todos seguem a mesma
 * estrutura (caixa que troca de tamanho conforme a rotação, ver
 * useNodeRotation.ts; handles terminal-a/terminal-b nas posições certas pra
 * cada ângulo), diferindo só no símbolo SVG e no label. BarraNode, TF3Node,
 * TPNode e LinhaNode ficam de fora por terem geometria genuinamente diferente
 * (handles dinâmicos, terceiro terminal, terminal único, sem rotação).
 */
export function EquipmentNodeShell({
  id,
  kind,
  rotation,
  selected,
  baseWidth,
  baseHeight,
  children,
  label,
  extra,
}: EquipmentNodeShellProps) {
  const { containerStyle, wrapperStyle } = useNodeRotation(id, rotation, baseWidth, baseHeight);

  return (
    <div
      className={`relative flex items-center justify-center ${selected ? "rounded-sm ring-2 ring-blue-500 ring-offset-1" : ""}`}
      style={containerStyle}
    >
      <Handle
        id="terminal-a"
        type="source"
        position={getTerminalPosition(kind, "terminal-a", rotation)}
        className="!z-10 !bg-slate-600"
      />
      <div style={wrapperStyle}>{children}</div>
      <Handle
        id="terminal-b"
        type="source"
        position={getTerminalPosition(kind, "terminal-b", rotation)}
        className="!z-10 !bg-slate-600"
      />
      {label}
      {extra}
    </div>
  );
}
