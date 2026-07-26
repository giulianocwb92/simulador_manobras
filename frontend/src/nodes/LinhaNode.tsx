import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { LinhaNodeType } from "../types/topology";

export function LinhaNode({ data, selected }: NodeProps<LinhaNodeType>) {
  return (
    <div className="relative h-6 w-8">
      <Handle id="terminal-a" type="source" position={Position.Left} className="!z-10 !bg-slate-600" />
      <svg viewBox="0 0 64 40" className="h-6 w-8">
        <line
          x1="0"
          y1="20"
          x2="40"
          y2="20"
          stroke={selected ? "#2563eb" : "#334155"}
          strokeWidth="2"
        />
        <path d="M36 12 L58 20 L36 28 Z" fill={selected ? "#2563eb" : "#334155"} />
      </svg>
      <div className="absolute top-full flex flex-col items-center whitespace-nowrap text-center" style={{ left: "50%", transform: "translateX(-50%)", marginTop: 2 }}>
        <span className="text-[9px] font-medium text-slate-600">{data.nome}</span>
        {data.destino_se_nome && <span className="text-[9px] text-slate-400">→ {data.destino_se_nome}</span>}
      </div>
    </div>
  );
}
