import { Handle, Position, type NodeProps } from "@xyflow/react";
import { WIRE_UNCONNECTED_STROKE } from "../constants/voltageColors";
import { VOLTAGE_COLORS, type BarraNodeType, type BarraTipo } from "../types/topology";
import { useBusHandles } from "./useBusHandles";
import { useNodeRotation } from "./useNodeRotation";

// Comprimento padrão da barra na orientação vertical (rotation = 0).
const BARRA_LENGTH = 200;

const STROKE_WIDTH: Record<BarraTipo, number> = {
  principal: 6,
  transferencia: 2,
  dupla: 6,
};

export function BarraNode({ id, data, selected }: NodeProps<BarraNodeType>) {
  const { handleIds } = useBusHandles(id);
  const { wrapperStyle } = useNodeRotation(id, data.rotation);
  // Barra de transferência só assume a cor da tensão quando há propagação
  // (Correção 3 — caminho fechado até ela); fora disso fica cinza.
  const color = data.tipo === "transferencia" ? WIRE_UNCONNECTED_STROKE : VOLTAGE_COLORS[data.tensao];
  const width = STROKE_WIDTH[data.tipo];

  return (
    <div className="flex flex-col items-center">
      <span className="mb-1 flex items-center gap-1 whitespace-nowrap text-xs font-semibold" style={{ color }}>
        {data.fonte && <span title="Barra fonte">⚡</span>}
        {data.nome} — {data.tensao} kV
      </span>
      <div style={wrapperStyle}>
        <div
          className={`relative rounded-full ${selected ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
          style={{ width, height: BARRA_LENGTH, backgroundColor: color }}
        >
          {handleIds.map((handleId, i) => {
            const top = ((i + 1) / (handleIds.length + 1)) * 100;
            return (
              <Handle
                key={handleId}
                id={handleId}
                type="source"
                position={Position.Right}
                style={{ top: `${top}%` }}
                className="!bg-slate-700"
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
