import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { LinhaNodeType } from "../types/topology";
import { getLabelPosition } from "../utils/labelPosition";

export function LinhaNode({ data, selected }: NodeProps<LinhaNodeType>) {
  return (
    <div className="relative">
      <Handle id="terminal-a" type="source" position={Position.Left} className="!z-10 !bg-slate-600" />
      <div
        className={`flex items-center gap-1 rounded-sm border-2 bg-white px-2 py-1 text-[10px] font-bold text-slate-800 ${
          selected ? "border-blue-500" : "border-slate-700"
        }`}
      >
        LINHA →
      </div>
      <div className="absolute flex flex-col items-center whitespace-nowrap text-center" style={getLabelPosition()}>
        <span className="text-[10px] font-medium text-slate-600">{data.nome}</span>
        {data.destino_se_nome && <span className="text-[9px] text-slate-400">→ {data.destino_se_nome}</span>}
      </div>
    </div>
  );
}
