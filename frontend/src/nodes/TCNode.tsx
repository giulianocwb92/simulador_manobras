import { Handle, type NodeProps } from "@xyflow/react";
import type { TCNodeType } from "../types/topology";
import { getTerminalPosition } from "../utils/edgePositions";
import { getLabelPosition } from "../utils/labelPosition";
import { useNodeRotation } from "./useNodeRotation";

export function TCNode({ id, data, selected }: NodeProps<TCNodeType>) {
  const rotation = data.rotation ?? 0;
  const { wrapperStyle } = useNodeRotation(id, rotation);

  return (
    <div className={`relative h-10 w-20 ${selected ? "rounded-sm ring-2 ring-blue-500 ring-offset-1" : ""}`}>
      <Handle
        id="terminal-a"
        type="source"
        position={getTerminalPosition("tc", "terminal-a", rotation)}
        className="!z-10 !bg-slate-600"
      />
      <div style={wrapperStyle}>
        <svg viewBox="0 0 80 40" className="h-10 w-20">
          <line x1="0" y1="20" x2="28" y2="20" stroke="#000000" strokeWidth="2" />
          <line x1="52" y1="20" x2="80" y2="20" stroke="#000000" strokeWidth="2" />
          <circle cx="40" cy="20" r="12" fill="none" stroke="#000000" strokeWidth="2" />
        </svg>
      </div>
      <Handle
        id="terminal-b"
        type="source"
        position={getTerminalPosition("tc", "terminal-b", rotation)}
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
