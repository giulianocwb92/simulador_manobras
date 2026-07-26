import { Handle, type NodeProps } from "@xyflow/react";
import type { JumperNodeType } from "../types/topology";
import { getTerminalPosition } from "../utils/edgePositions";
import { getEquipmentLabelPosition } from "../utils/labelPosition";
import { useNodeRotation } from "./useNodeRotation";

// Cor âmbar identifica elementos provisórios (jumper/chave provisória) em
// contraste com o vermelho/verde usado pelo estado de equipamentos permanentes.
const PROVISORIO_COLOR = "#d97706";

export function JumperNode({ id, data, selected }: NodeProps<JumperNodeType>) {
  const rotation = data.rotation ?? 0;
  const { containerStyle, wrapperStyle } = useNodeRotation(id, rotation, 48, 24);

  return (
    <div
      className={`relative flex items-center justify-center ${selected ? "rounded-sm ring-2 ring-blue-500 ring-offset-1" : ""}`}
      style={containerStyle}
    >
      <Handle
        id="terminal-a"
        type="source"
        position={getTerminalPosition("jumper", "terminal-a", rotation)}
        className="!z-10 !bg-slate-600"
      />
      <div style={wrapperStyle}>
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
      </div>
      <Handle
        id="terminal-b"
        type="source"
        position={getTerminalPosition("jumper", "terminal-b", rotation)}
        className="!z-10 !bg-slate-600"
      />
      <span
        title={data.permanente ? `${data.label} (permanente)` : data.label}
        className="absolute max-w-20 break-words rounded bg-white/85 px-0.5 text-center text-[9px] font-medium leading-tight text-amber-700"
        style={getEquipmentLabelPosition(rotation)}
      >
        {data.label}
        {data.permanente ? " (P)" : ""}
      </span>
    </div>
  );
}
