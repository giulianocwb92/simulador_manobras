import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { TCNodeType } from "../types/topology";

export function TCNode({ data, selected }: NodeProps<TCNodeType>) {
  return (
    <div className="flex items-center gap-1">
      <Handle id="terminal-a" type="source" position={Position.Left} className="!bg-slate-600" />
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-sm border-2 bg-white text-[10px] font-bold text-slate-800 ${
          selected ? "border-blue-500" : "border-slate-700"
        }`}
      >
        TC
      </div>
      <span className="whitespace-nowrap text-[10px] font-medium text-slate-600">{data.label}</span>
    </div>
  );
}
