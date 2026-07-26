import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { TF3NodeType } from "../types/topology";
import { getTerminalPosition } from "../utils/edgePositions";
import { LABEL_POSITION } from "../utils/labelPosition";
import { useNodeRotation } from "./useNodeRotation";

export function TF3Node({ id, data, selected }: NodeProps<TF3NodeType>) {
  const rotation = data.rotation ?? 0;
  const { wrapperStyle } = useNodeRotation(id, rotation);
  const posA = getTerminalPosition("tf3", "terminal-a", rotation);
  const posB = getTerminalPosition("tf3", "terminal-b", rotation);
  const posTer = getTerminalPosition("tf3", "terminal-ter", rotation);
  // Terminais a/b ficam alinhados com o par de enrolamentos superior (y=12 de 34px),
  // não com o centro vertical da caixa — só faz sentido quando saem pela lateral.
  const lateralOffset = (pos: Position) => (pos === Position.Left || pos === Position.Right ? { top: 12 } : undefined);

  return (
    <div className={`relative h-[34px] w-12 ${selected ? "rounded-sm ring-2 ring-blue-500 ring-offset-1" : ""}`}>
      <Handle id="terminal-a" type="source" position={posA} style={lateralOffset(posA)} className="!z-10 !bg-slate-600" />
      <div style={wrapperStyle}>
        <svg viewBox="0 0 80 56" className="h-[34px] w-12">
          <line x1="0" y1="20" x2="24" y2="20" stroke="#000000" strokeWidth="2" />
          <line x1="56" y1="20" x2="80" y2="20" stroke="#000000" strokeWidth="2" />
          <line x1="40" y1="46" x2="40" y2="56" stroke="#000000" strokeWidth="2" />
          <circle cx="34" cy="20" r="12" fill="none" stroke="#000000" strokeWidth="2" />
          <circle cx="46" cy="20" r="12" fill="none" stroke="#000000" strokeWidth="2" />
          <circle cx="40" cy="34" r="12" fill="none" stroke="#000000" strokeWidth="2" />
        </svg>
      </div>
      <Handle id="terminal-b" type="source" position={posB} style={lateralOffset(posB)} className="!z-10 !bg-slate-600" />
      <Handle id="terminal-ter" type="source" position={posTer} className="!z-10 !bg-slate-600" />
      <span
        className="absolute whitespace-nowrap text-[9px] font-medium text-slate-600"
        style={LABEL_POSITION}
      >
        {data.label}
      </span>
      {/* Tensão de cada enrolamento, sempre horizontal e fora do wrapper
          rotacionado (mesmo motivo do label principal — ver labelPosition.ts). */}
      <span className="absolute left-0 top-full mt-0.5 whitespace-nowrap text-[7px] text-slate-500">
        {data.tensao_at} kV
      </span>
      <span className="absolute right-0 top-full mt-0.5 whitespace-nowrap text-[7px] text-slate-500">
        {data.tensao_bt} kV
      </span>
      <span className="absolute left-1/2 top-full mt-3 -translate-x-1/2 whitespace-nowrap text-[7px] text-slate-500">
        {data.tensao_ter} kV
      </span>
    </div>
  );
}
