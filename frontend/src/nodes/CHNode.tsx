import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { CHNodeType } from "../types/topology";

export function CHNode({ data, selected }: NodeProps<CHNodeType>) {
  const aberto = data.estado === "aberto";
  return (
    <div className="flex flex-col items-center">
      <Handle id="terminal-a" type="source" position={Position.Top} className="!bg-slate-600" />
      <div
        className={`flex h-10 w-10 items-center justify-center border-2 text-sm font-bold ${
          selected ? "border-blue-500" : "border-slate-700"
        } ${aberto ? "bg-red-50 text-red-600" : "bg-white text-slate-800"}`}
      >
        <svg viewBox="0 0 20 20" className="h-5 w-5" stroke="currentColor" strokeWidth="2" fill="none">
          <line x1="10" y1="0" x2="10" y2="20" transform={aberto ? "rotate(25 10 10)" : undefined} />
        </svg>
      </div>
      <Handle id="terminal-b" type="source" position={Position.Bottom} className="!bg-slate-600" />
      <span className="mt-1 whitespace-nowrap text-[10px] font-medium text-slate-600">{data.label}</span>
    </div>
  );
}
