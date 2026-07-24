import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { CHNodeType } from "../types/topology";
import { useNodeRotation } from "./useNodeRotation";

export function CHNode({ id, data, selected }: NodeProps<CHNodeType>) {
  const aberto = data.estado === "aberto";
  const { wrapperStyle } = useNodeRotation(id, data.rotation);
  // Convenção COPEL: fechado (energizado) = vermelho, aberto (isolado) = verde.
  const color = aberto ? "#16a34a" : "#dc2626";

  return (
    <div className="flex flex-col items-center">
      <div
        style={wrapperStyle}
        className={`relative h-10 w-20 rounded-sm ${selected ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
      >
        <Handle id="terminal-a" type="source" position={Position.Left} className="!bg-slate-600" />
        <svg viewBox="0 0 80 40" className="h-10 w-20">
          <line x1="0" y1="20" x2="28" y2="20" stroke={color} strokeWidth="2" />
          <line x1="52" y1="20" x2="80" y2="20" stroke={color} strokeWidth="2" />
          {aberto ? (
            <line x1="30" y1="27" x2="50" y2="13" stroke={color} strokeWidth="3" strokeLinecap="round" />
          ) : (
            <>
              <line x1="28" y1="20" x2="52" y2="20" stroke={color} strokeWidth="2" />
              <circle cx="35" cy="20" r="3.5" fill="white" stroke={color} strokeWidth="2" />
              <circle cx="45" cy="20" r="3.5" fill="white" stroke={color} strokeWidth="2" />
            </>
          )}
        </svg>
        <Handle id="terminal-b" type="source" position={Position.Right} className="!bg-slate-600" />
      </div>
      <span className="mt-1 whitespace-nowrap text-[10px] font-medium text-slate-600">{data.label}</span>
    </div>
  );
}
