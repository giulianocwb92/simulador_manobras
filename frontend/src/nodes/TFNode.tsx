import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { TFNodeType } from "../types/topology";

export function TFNode({ data, selected }: NodeProps<TFNodeType>) {
  return (
    <div className="flex flex-col items-center">
      <Handle id="terminal-at" type="source" position={Position.Top} className="!bg-slate-600" />
      <div
        className={`relative flex h-14 w-12 items-center justify-center rounded-sm ${
          selected ? "ring-2 ring-blue-500" : ""
        }`}
      >
        <div className="absolute top-0 h-8 w-8 rounded-full border-2 border-slate-700 bg-white" />
        <div className="absolute bottom-0 h-8 w-8 rounded-full border-2 border-slate-700 bg-white/70" />
      </div>
      <Handle id="terminal-bt" type="source" position={Position.Bottom} className="!bg-slate-600" />
      {data.tensao_ter && (
        <Handle
          id="terminal-ter"
          type="source"
          position={Position.Right}
          className="!bottom-2 !top-auto !bg-slate-600"
        />
      )}
      <span className="mt-1 whitespace-nowrap text-[10px] font-medium text-slate-600">{data.label}</span>
    </div>
  );
}
