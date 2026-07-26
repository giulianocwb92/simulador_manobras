import { Handle, type NodeProps } from "@xyflow/react";
import type { CHNodeType } from "../types/topology";
import { getTerminalPosition } from "../utils/edgePositions";
import { getLabelPosition } from "../utils/labelPosition";
import { useNodeRotation } from "./useNodeRotation";

export function CHNode({ id, data, selected }: NodeProps<CHNodeType>) {
  const aberto = data.estado === "aberto";
  const rotation = data.rotation ?? 0;
  const { wrapperStyle } = useNodeRotation(id, rotation);
  // Convenção COPEL: fechado (energizado) = vermelho, aberto (isolado) = verde.
  const color = aberto ? "#16a34a" : "#dc2626";

  return (
    <div className={`relative h-10 w-20 ${selected ? "rounded-sm ring-2 ring-blue-500 ring-offset-1" : ""}`}>
      <Handle
        id="terminal-a"
        type="source"
        position={getTerminalPosition("chave", "terminal-a", rotation)}
        className="!z-10 !bg-slate-600"
      />
      <div style={wrapperStyle}>
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
      </div>
      <Handle
        id="terminal-b"
        type="source"
        position={getTerminalPosition("chave", "terminal-b", rotation)}
        className="!z-10 !bg-slate-600"
      />
      <span
        className="absolute whitespace-nowrap text-[10px] font-medium text-slate-600"
        style={getLabelPosition(rotation)}
      >
        {data.label}
      </span>
    </div>
  );
}
