import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ReligadorNodeType } from "../types/topology";
import { useNodeRotation } from "./useNodeRotation";

export function ReligadorNode({ id, data, selected }: NodeProps<ReligadorNodeType>) {
  const aberto = data.estado === "aberto";
  const { wrapperStyle } = useNodeRotation(id, data.rotation);
  // Convenção COPEL: fechado (energizado) = vermelho, aberto (isolado) = verde.
  const fill = aberto ? "#16a34a" : "#dc2626";
  const stroke = aberto ? "#15803d" : "#991b1b";

  return (
    <div className="flex flex-col items-center">
      <div
        style={wrapperStyle}
        className={`relative h-10 w-20 rounded-sm ${selected ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
      >
        <Handle id="terminal-a" type="source" position={Position.Left} className="!bg-slate-600" />
        <svg viewBox="0 0 80 40" className="h-10 w-20">
          <line x1="0" y1="20" x2="30" y2="20" stroke="#334155" strokeWidth="2" />
          <rect x="30" y="10" width="20" height="20" fill={fill} stroke={stroke} strokeWidth="2" />
          <text x="40" y="24" textAnchor="middle" fontSize="12" fontWeight="bold" fill="white">
            R
          </text>
          <line x1="50" y1="20" x2="80" y2="20" stroke="#334155" strokeWidth="2" />
        </svg>
        <Handle id="terminal-b" type="source" position={Position.Right} className="!bg-slate-600" />
      </div>
      <span
        title={data.label}
        className="mt-1 max-w-20 break-words rounded bg-white/85 px-0.5 text-center text-[10px] font-medium leading-tight text-slate-600"
      >
        {data.label}
      </span>
    </div>
  );
}
