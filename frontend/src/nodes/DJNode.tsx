import { Handle, type NodeProps } from "@xyflow/react";
import type { DJNodeType } from "../types/topology";
import { getTerminalPosition } from "../utils/edgePositions";
import { LABEL_POSITION } from "../utils/labelPosition";
import { useNodeRotation } from "./useNodeRotation";

export function DJNode({ id, data, selected }: NodeProps<DJNodeType>) {
  const aberto = data.estado === "aberto";
  const rotation = data.rotation ?? 0;
  const { wrapperStyle } = useNodeRotation(id, rotation);
  // Convenção COPEL: fechado (energizado) = vermelho, aberto (isolado) = verde.
  const fill = aberto ? "#16a34a" : "#dc2626";
  const stroke = aberto ? "#15803d" : "#991b1b";

  return (
    <div className={`relative h-6 w-12 ${selected ? "rounded-sm ring-2 ring-blue-500 ring-offset-1" : ""}`}>
      <Handle
        id="terminal-a"
        type="source"
        position={getTerminalPosition("disjuntor", "terminal-a", rotation)}
        className="!z-10 !bg-slate-600"
      />
      <div style={wrapperStyle}>
        <svg viewBox="0 0 80 40" className="h-6 w-12">
          <line x1="0" y1="20" x2="30" y2="20" stroke="#334155" strokeWidth="2" />
          <rect x="30" y="10" width="20" height="20" fill={fill} stroke={stroke} strokeWidth="2" />
          <line x1="50" y1="20" x2="80" y2="20" stroke="#334155" strokeWidth="2" />
        </svg>
      </div>
      <Handle
        id="terminal-b"
        type="source"
        position={getTerminalPosition("disjuntor", "terminal-b", rotation)}
        className="!z-10 !bg-slate-600"
      />
      <span
        className="absolute whitespace-nowrap text-[9px] font-medium text-slate-600"
        style={LABEL_POSITION}
      >
        {data.label}
      </span>
    </div>
  );
}
