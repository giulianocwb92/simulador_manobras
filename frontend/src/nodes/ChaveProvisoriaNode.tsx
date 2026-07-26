import { Handle, type NodeProps } from "@xyflow/react";
import type { ChaveProvisoriaNodeType } from "../types/topology";
import { getTerminalPosition } from "../utils/edgePositions";
import { getEquipmentLabelPosition } from "../utils/labelPosition";
import { useNodeRotation } from "./useNodeRotation";

export function ChaveProvisoriaNode({ id, data, selected }: NodeProps<ChaveProvisoriaNodeType>) {
  const aberto = data.estado === "aberto";
  const rotation = data.rotation ?? 0;
  const { containerStyle, wrapperStyle } = useNodeRotation(id, rotation, 48, 24);
  // Convenção COPEL: fechado (energizado) = vermelho, aberto (isolado) = verde.
  const color = aberto ? "#16a34a" : "#dc2626";

  return (
    <div
      className={`relative flex items-center justify-center ${selected ? "rounded-sm ring-2 ring-blue-500 ring-offset-1" : ""}`}
      style={containerStyle}
    >
      <Handle
        id="terminal-a"
        type="source"
        position={getTerminalPosition("chave_provisoria", "terminal-a", rotation)}
        className="!z-10 !bg-slate-600"
      />
      <div style={wrapperStyle}>
        <svg viewBox="0 0 80 40" className="h-full w-full">
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
          {/* Contorno tracejado âmbar identifica a chave como elemento provisório */}
          <rect
            x="2"
            y="2"
            width="76"
            height="36"
            rx="4"
            fill="none"
            stroke="#d97706"
            strokeWidth="1.5"
            strokeDasharray="5 3"
          />
        </svg>
      </div>
      <Handle
        id="terminal-b"
        type="source"
        position={getTerminalPosition("chave_provisoria", "terminal-b", rotation)}
        className="!z-10 !bg-slate-600"
      />
      <span
        title={data.permanente ? `${data.label} (permanente)` : data.label}
        className="absolute whitespace-nowrap text-[9px] font-medium text-amber-700"
        style={getEquipmentLabelPosition(rotation)}
      >
        {data.label}
        {data.permanente ? " (P)" : ""}
      </span>
    </div>
  );
}
