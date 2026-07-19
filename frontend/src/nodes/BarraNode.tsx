import { Handle, Position, useEdges, type NodeProps } from "@xyflow/react";
import { VOLTAGE_COLORS, type BarraNodeType } from "../types/topology";

export function BarraNode({ id, data, selected }: NodeProps<BarraNodeType>) {
  const edges = useEdges();
  const connectionCount = edges.filter((e) => e.source === id || e.target === id).length;
  const handleCount = Math.max(3, connectionCount + 1);
  const color = VOLTAGE_COLORS[data.tensao];

  return (
    <div
      className={`relative flex h-10 min-w-[220px] items-center justify-center rounded-sm px-6 text-xs font-semibold text-white shadow-sm ${
        selected ? "ring-2 ring-blue-500 ring-offset-1" : ""
      }`}
      style={{ backgroundColor: color }}
    >
      <span>
        BARRA {data.tensao} kV — {data.label}
      </span>
      <div className="pointer-events-none absolute -bottom-1 left-0 flex w-full justify-evenly">
        {Array.from({ length: handleCount }).map((_, i) => (
          <Handle
            key={i}
            id={`terminal-${i}`}
            type="source"
            position={Position.Bottom}
            className="pointer-events-auto !static !translate-x-0 !bg-slate-700"
          />
        ))}
      </div>
    </div>
  );
}
