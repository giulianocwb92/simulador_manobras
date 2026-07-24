import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { TCNodeType } from "../types/topology";
import { useNodeRotation } from "./useNodeRotation";

export function TCNode({ id, data, selected }: NodeProps<TCNodeType>) {
  const { wrapperStyle } = useNodeRotation(id, data.rotation);

  return (
    <div className="flex flex-col items-center">
      <span className="mb-1 whitespace-nowrap text-[10px] font-medium text-slate-600">{data.label}</span>
      <div
        style={wrapperStyle}
        className={`relative h-10 w-20 rounded-sm ${selected ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
      >
        <Handle id="terminal-a" type="source" position={Position.Left} className="!bg-slate-600" />
        <svg viewBox="0 0 80 40" className="h-10 w-20">
          <line x1="0" y1="20" x2="28" y2="20" stroke="#000000" strokeWidth="2" />
          <line x1="52" y1="20" x2="80" y2="20" stroke="#000000" strokeWidth="2" />
          <circle cx="40" cy="20" r="12" fill="none" stroke="#000000" strokeWidth="2" />
        </svg>
        <Handle id="terminal-b" type="source" position={Position.Right} className="!bg-slate-600" />
      </div>
    </div>
  );
}
