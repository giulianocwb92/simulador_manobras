import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { TF3NodeType } from "../types/topology";
import { useNodeRotation } from "./useNodeRotation";

export function TF3Node({ id, data, selected }: NodeProps<TF3NodeType>) {
  const { wrapperStyle } = useNodeRotation(id, data.rotation);

  return (
    <div className="flex flex-col items-center">
      <div
        style={wrapperStyle}
        className={`relative h-14 w-20 rounded-sm ${selected ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
      >
        <Handle id="terminal-a" type="source" position={Position.Left} className="!top-5 !bg-slate-600" />
        <svg viewBox="0 0 80 56" className="h-14 w-20">
          <line x1="0" y1="20" x2="24" y2="20" stroke="#000000" strokeWidth="2" />
          <line x1="56" y1="20" x2="80" y2="20" stroke="#000000" strokeWidth="2" />
          <line x1="40" y1="46" x2="40" y2="56" stroke="#000000" strokeWidth="2" />
          <circle cx="34" cy="20" r="12" fill="none" stroke="#000000" strokeWidth="2" />
          <circle cx="46" cy="20" r="12" fill="none" stroke="#000000" strokeWidth="2" />
          <circle cx="40" cy="34" r="12" fill="none" stroke="#000000" strokeWidth="2" />
        </svg>
        <Handle id="terminal-b" type="source" position={Position.Right} className="!top-5 !bg-slate-600" />
        <Handle id="terminal-ter" type="source" position={Position.Bottom} className="!bg-slate-600" />
      </div>
      <span className="mt-1 whitespace-nowrap text-[10px] font-medium text-slate-600">{data.label}</span>
    </div>
  );
}
