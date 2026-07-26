import { Handle, type NodeProps } from "@xyflow/react";
import type { ReligadorNodeType } from "../types/topology";
import { getTerminalPosition } from "../utils/edgePositions";
import { getEquipmentLabelPosition } from "../utils/labelPosition";
import { useNodeRotation } from "./useNodeRotation";

export function ReligadorNode({ id, data, selected }: NodeProps<ReligadorNodeType>) {
  const aberto = data.estado === "aberto";
  const rotation = data.rotation ?? 0;
  const { containerStyle, wrapperStyle } = useNodeRotation(id, rotation, 48, 24);
  // Convenção COPEL: fechado (energizado) = vermelho, aberto (isolado) = verde.
  const fill = aberto ? "#16a34a" : "#dc2626";
  const stroke = aberto ? "#15803d" : "#991b1b";

  return (
    <div
      className={`relative flex items-center justify-center ${selected ? "rounded-sm ring-2 ring-blue-500 ring-offset-1" : ""}`}
      style={containerStyle}
    >
      <Handle
        id="terminal-a"
        type="source"
        position={getTerminalPosition("religador", "terminal-a", rotation)}
        className="!z-10 !bg-slate-600"
      />
      <div style={wrapperStyle}>
        <svg viewBox="0 0 80 40" className="h-full w-full">
          <line x1="0" y1="20" x2="30" y2="20" stroke="#334155" strokeWidth="2" />
          <rect x="30" y="10" width="20" height="20" fill={fill} stroke={stroke} strokeWidth="2" />
          <text x="40" y="24" textAnchor="middle" fontSize="12" fontWeight="bold" fill="white">
            R
          </text>
          <line x1="50" y1="20" x2="80" y2="20" stroke="#334155" strokeWidth="2" />
        </svg>
      </div>
      <Handle
        id="terminal-b"
        type="source"
        position={getTerminalPosition("religador", "terminal-b", rotation)}
        className="!z-10 !bg-slate-600"
      />
      <span
        title={data.label}
        className="absolute max-w-20 break-words rounded bg-white/85 px-0.5 text-center text-[9px] font-medium leading-tight text-slate-600"
        style={getEquipmentLabelPosition(rotation)}
      >
        {data.label}
      </span>
    </div>
  );
}
