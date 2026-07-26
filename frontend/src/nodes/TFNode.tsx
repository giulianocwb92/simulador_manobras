import { Handle, type NodeProps } from "@xyflow/react";
import type { TFNodeType } from "../types/topology";
import { getTerminalPosition } from "../utils/edgePositions";
import { getEquipmentLabelPosition } from "../utils/labelPosition";
import { useNodeRotation } from "./useNodeRotation";

export function TFNode({ id, data, selected }: NodeProps<TFNodeType>) {
  const rotation = data.rotation ?? 0;
  const { containerStyle, wrapperStyle } = useNodeRotation(id, rotation, 48, 24);

  return (
    <div
      className={`relative flex items-center justify-center ${selected ? "rounded-sm ring-2 ring-blue-500 ring-offset-1" : ""}`}
      style={containerStyle}
    >
      <Handle
        id="terminal-a"
        type="source"
        position={getTerminalPosition("transformador", "terminal-a", rotation)}
        className="!z-10 !bg-slate-600"
      />
      <div style={wrapperStyle}>
        <svg viewBox="0 0 80 40" className="h-full w-full">
          <line x1="0" y1="20" x2="24" y2="20" stroke="#000000" strokeWidth="2" />
          <line x1="56" y1="20" x2="80" y2="20" stroke="#000000" strokeWidth="2" />
          <circle cx="34" cy="20" r="12" fill="none" stroke="#000000" strokeWidth="2" />
          <circle cx="46" cy="20" r="12" fill="none" stroke="#000000" strokeWidth="2" />
        </svg>
      </div>
      <Handle
        id="terminal-b"
        type="source"
        position={getTerminalPosition("transformador", "terminal-b", rotation)}
        className="!z-10 !bg-slate-600"
      />
      <span
        className="absolute whitespace-nowrap text-[9px] font-medium text-slate-600"
        style={getEquipmentLabelPosition(rotation)}
      >
        {data.label}
      </span>
      {/* Tensão de cada lado, sempre horizontal e fora do wrapper rotacionado
          (mesmo motivo do label principal — ver labelPosition.ts). */}
      <span className="absolute left-0 top-full mt-0.5 whitespace-nowrap text-[7px] text-slate-500">
        {data.tensao_at} kV
      </span>
      <span className="absolute right-0 top-full mt-0.5 whitespace-nowrap text-[7px] text-slate-500">
        {data.tensao_bt} kV
      </span>
    </div>
  );
}
