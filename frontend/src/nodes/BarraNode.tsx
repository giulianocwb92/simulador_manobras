import { useEffect } from "react";
import { Handle, useUpdateNodeInternals, type NodeProps } from "@xyflow/react";
import { WIRE_UNCONNECTED_STROKE } from "../constants/voltageColors";
import { VOLTAGE_COLORS, type BarraNodeType, type BarraTipo } from "../types/topology";
import { getBarraHandlePosition } from "../utils/edgePositions";
import { getLabelPosition } from "../utils/labelPosition";
import { useNodeRotation } from "./useNodeRotation";

// Comprimento padrão da barra na orientação vertical (rotation = 0).
const BARRA_LENGTH = 200;

const STROKE_WIDTH: Record<BarraTipo, number> = {
  principal: 6,
  transferencia: 2,
  dupla: 6,
};

export function BarraNode({ id, data, selected }: NodeProps<BarraNodeType>) {
  const rotation = data.rotation ?? 0;
  const { wrapperStyle } = useNodeRotation(id, rotation);
  // Barra de transferência só assume a cor da tensão quando há propagação
  // (Correção 3 — caminho fechado até ela); fora disso fica cinza.
  const color = data.tipo === "transferencia" ? WIRE_UNCONNECTED_STROKE : VOLTAGE_COLORS[data.tensao];
  const width = STROKE_WIDTH[data.tipo];
  const handlePosition = getBarraHandlePosition(rotation);
  const isHorizontal = rotation === 90 || rotation === 270;
  const handles = data.handles ?? [];

  // Handles dinâmicos são criados em runtime (ver Correção 3) — o React Flow só
  // registra a posição de um handle novo no node depois de remedir o DOM.
  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, handles.length, updateNodeInternals]);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: isHorizontal ? BARRA_LENGTH : width, height: isHorizontal ? width : BARRA_LENGTH }}
    >
      <div style={wrapperStyle}>
        <div
          data-barra-id={id}
          className={`rounded-full ${selected ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
          style={{ width, height: BARRA_LENGTH, backgroundColor: color }}
        />
      </div>

      {handles.map((h) => (
        <Handle
          key={h.id}
          id={h.id}
          type="source"
          position={handlePosition}
          style={
            isHorizontal
              ? { left: `${h.position * 100}%`, top: "100%" }
              : { top: `${h.position * 100}%`, left: "100%" }
          }
          className="!z-10 !bg-slate-700"
        />
      ))}

      <span
        className="absolute flex items-center gap-1 whitespace-nowrap text-xs font-semibold"
        style={{ ...getLabelPosition(rotation), color }}
      >
        {data.fonte && <span title="Barra fonte">⚡</span>}
        {data.nome} — {data.tensao} kV
      </span>
    </div>
  );
}
