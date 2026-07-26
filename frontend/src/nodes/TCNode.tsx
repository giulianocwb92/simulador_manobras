import type { NodeProps } from "@xyflow/react";
import type { TCNodeType } from "../types/topology";
import { getEquipmentLabelPosition } from "../utils/labelPosition";
import { EquipmentNodeShell } from "./EquipmentNodeShell";

export function TCNode({ id, data, selected }: NodeProps<TCNodeType>) {
  const rotation = data.rotation ?? 0;

  return (
    <EquipmentNodeShell
      id={id}
      kind="tc"
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
        <line x1="0" y1="20" x2="28" y2="20" stroke="#000000" strokeWidth="2" />
        <line x1="52" y1="20" x2="80" y2="20" stroke="#000000" strokeWidth="2" />
        <circle cx="40" cy="20" r="12" fill="none" stroke="#000000" strokeWidth="2" />
      </svg>
    </EquipmentNodeShell>
  );
}
