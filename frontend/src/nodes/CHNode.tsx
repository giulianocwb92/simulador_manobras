import type { NodeProps } from "@xyflow/react";
import type { CHNodeType } from "../types/topology";
import { getEquipmentLabelPosition } from "../utils/labelPosition";
import { EquipmentNodeShell } from "./EquipmentNodeShell";

export function CHNode({ id, data, selected }: NodeProps<CHNodeType>) {
  const aberto = data.estado === "aberto";
  const rotation = data.rotation ?? 0;
  // Convenção COPEL: fechado (energizado) = vermelho, aberto (isolado) = verde.
  const color = aberto ? "#16a34a" : "#dc2626";

  return (
    <EquipmentNodeShell
      id={id}
      kind="chave"
      rotation={rotation}
      selected={selected}
      baseWidth={48}
      baseHeight={24}
      label={
        <span
          className="absolute whitespace-nowrap text-[9px] font-medium text-slate-600"
          style={getEquipmentLabelPosition(rotation)}
        >
          {data.label}
        </span>
      }
    >
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
      </svg>
    </EquipmentNodeShell>
  );
}
