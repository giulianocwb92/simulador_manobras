import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { TF3NodeType } from "../types/topology";
import { getTerminalPosition } from "../utils/edgePositions";
import { getLabelPosition } from "../utils/labelPosition";
import { useNodeRotation } from "./useNodeRotation";

export function TF3Node({ id, data, selected }: NodeProps<TF3NodeType>) {
  const rotation = data.rotation ?? 0;
  const { wrapperStyle } = useNodeRotation(id, rotation);
  const posA = getTerminalPosition("tf3", "terminal-a", rotation);
  const posB = getTerminalPosition("tf3", "terminal-b", rotation);
  const posTer = getTerminalPosition("tf3", "terminal-ter", rotation);
  // Terminais a/b ficam alinhados com o par de enrolamentos superior (y=20 de 56px),
  // não com o centro vertical da caixa — só faz sentido quando saem pela lateral.
  const lateralOffset = (pos: Position) => (pos === Position.Left || pos === Position.Right ? { top: 20 } : undefined);

  return (
    <div className={`relative h-14 w-20 ${selected ? "rounded-sm ring-2 ring-blue-500 ring-offset-1" : ""}`}>
      <Handle id="terminal-a" type="source" position={posA} style={lateralOffset(posA)} className="!z-10 !bg-slate-600" />
      <div style={wrapperStyle}>
        <svg viewBox="0 0 80 56" className="h-14 w-20">
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
        className="absolute whitespace-nowrap text-[10px] font-medium text-slate-600"
        style={getLabelPosition(rotation)}
      >
        {data.label}
      </span>
    </div>
  );
}
