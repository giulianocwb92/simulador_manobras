import type { NodeProps } from "@xyflow/react";
import type { JumperNodeType } from "../types/topology";
import { getEquipmentLabelPosition } from "../utils/labelPosition";
import { EquipmentNodeShell } from "./EquipmentNodeShell";

// Cor âmbar identifica elementos provisórios (jumper/chave provisória) em
// contraste com o vermelho/verde usado pelo estado de equipamentos permanentes.
const PROVISORIO_COLOR = "#d97706";

export function JumperNode({ id, data, selected }: NodeProps<JumperNodeType>) {
  const rotation = data.rotation ?? 0;

  return (
    <EquipmentNodeShell
      id={id}
      kind="jumper"
      rotation={rotation}
      selected={selected}
      baseWidth={48}
      baseHeight={24}
      label={
        <span
          title={data.label}
          className="absolute max-w-20 break-words rounded bg-white/85 px-0.5 text-center text-[9px] font-medium leading-tight text-amber-700"
          style={getEquipmentLabelPosition(rotation)}
        >
          {data.label}
        </span>
      }
    >
      <svg viewBox="0 0 80 40" className="h-full w-full">
        <line x1="0" y1="20" x2="16" y2="20" stroke={PROVISORIO_COLOR} strokeWidth="2" />
        {/* Cabo flexível: forma serpenteada distingue jumper de uma conexão fixa */}
        <path
          d="M16 20 L26 8 L36 32 L46 8 L56 32 L64 20"
          fill="none"
          stroke={PROVISORIO_COLOR}
          strokeWidth="2"
          strokeDasharray="4 2"
          strokeLinecap="round"
        />
        <line x1="64" y1="20" x2="80" y2="20" stroke={PROVISORIO_COLOR} strokeWidth="2" />
      </svg>
    </EquipmentNodeShell>
  );
}
