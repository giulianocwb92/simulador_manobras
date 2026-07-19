import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { LinhaNodeType } from "../types/topology";

export function LinhaNode({ data, selected }: NodeProps<LinhaNodeType>) {
  return (
    <div className="flex flex-col items-center">
      <Handle id="terminal-a" type="source" position={Position.Top} className="!bg-slate-600" />
      <div
        className={`flex items-center gap-1 rounded-sm border-2 bg-white px-2 py-1 text-[10px] font-bold text-slate-800 ${
          selected ? "border-blue-500" : "border-slate-700"
        }`}
      >
        LINHA →
      </div>
      <span className="mt-1 whitespace-nowrap text-[10px] font-medium text-slate-600">{data.nome}</span>
      {data.destino_se_nome && (
        <span className="whitespace-nowrap text-[9px] text-slate-400">→ {data.destino_se_nome}</span>
      )}
    </div>
  );
}
