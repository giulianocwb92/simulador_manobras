import { Handle, type NodeProps } from "@xyflow/react";
import type { TPNodeType } from "../types/topology";
import { getTerminalPosition } from "../utils/edgePositions";
import { LABEL_POSITION } from "../utils/labelPosition";
import { useNodeRotation } from "./useNodeRotation";

export function TPNode({ id, data, selected }: NodeProps<TPNodeType>) {
  const rotation = data.rotation ?? 0;
  const { wrapperStyle } = useNodeRotation(id, rotation);

  return (
    <div className={`relative h-[54px] w-6 ${selected ? "rounded-sm ring-2 ring-blue-500 ring-offset-1" : ""}`}>
      <Handle
        id="terminal-a"
        type="source"
        position={getTerminalPosition("tp", "terminal-a", rotation)}
        className="!z-10 !bg-slate-600"
      />
      <div style={wrapperStyle}>
        <svg viewBox="0 0 40 90" className="h-[54px] w-6">
          <line x1="20" y1="0" x2="20" y2="16" stroke="#000000" strokeWidth="2" />
          <circle cx="20" cy="26" r="11" fill="none" stroke="#000000" strokeWidth="2" />
          <circle cx="20" cy="38" r="11" fill="none" stroke="#000000" strokeWidth="2" />
          <line x1="20" y1="49" x2="20" y2="60" stroke="#000000" strokeWidth="2" />
          <line x1="10" y1="64" x2="30" y2="64" stroke="#000000" strokeWidth="2" />
          <line x1="13" y1="68" x2="27" y2="68" stroke="#000000" strokeWidth="2" />
          <line x1="16" y1="72" x2="24" y2="72" stroke="#000000" strokeWidth="2" />
        </svg>
      </div>
      <span
        className="absolute whitespace-nowrap text-[9px] font-medium text-slate-600"
        style={LABEL_POSITION}
      >
        {data.label}
      </span>
    </div>
  );
}
