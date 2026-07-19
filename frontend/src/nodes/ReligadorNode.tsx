import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ReligadorNodeType } from "../types/topology";

export function ReligadorNode({ data, selected }: NodeProps<ReligadorNodeType>) {
  const aberto = data.estado === "aberto";
  return (
    <div className="flex flex-col items-center">
      <Handle id="terminal-a" type="source" position={Position.Top} className="!bg-slate-600" />
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-sm border-2 text-sm font-bold ${
          selected ? "border-blue-500" : "border-slate-700"
        } ${aberto ? "bg-red-50 text-red-600" : "bg-white text-slate-800"}`}
      >
        R
      </div>
      <Handle id="terminal-b" type="source" position={Position.Bottom} className="!bg-slate-600" />
      <span className="mt-1 whitespace-nowrap text-[10px] font-medium text-slate-600">{data.label}</span>
    </div>
  );
}
