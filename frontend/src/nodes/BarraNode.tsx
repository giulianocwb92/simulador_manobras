import { useEffect } from "react";
import { Handle, useUpdateNodeInternals, type NodeProps } from "@xyflow/react";
import { WIRE_UNCONNECTED_STROKE } from "../constants/voltageColors";
import { VOLTAGE_COLORS, type BarraNodeType, type BarraTipo } from "../types/topology";
import { computeBarraLength } from "../utils/barraLayout";
import { getBarraHandlePosition } from "../utils/edgePositions";
import { LABEL_POSITION } from "../utils/labelPosition";
import { useNodeRotation } from "./useNodeRotation";

// Largura da área clicável pra criar handle (bem maior que a barra em si, fina
// demais pra clicar com precisão) — também é o que decide de qual lado
// (início/fim) o novo handle sai, ver Canvas.tsx.
const HIT_AREA_WIDTH = 30;
// Afasta o ponto/handle um pouco da barra em vez de encostar nela, como era
// antes — só estética, o wire continua reto (é a mesma direção da barra).
const HANDLE_GAP = 6;

const STROKE_WIDTH: Record<BarraTipo, number> = {
  principal: 6,
  transferencia: 2,
  dupla: 6,
};

export function BarraNode({ id, data, selected }: NodeProps<BarraNodeType>) {
  const rotation = data.rotation ?? 0;
  const { wrapperStyle } = useNodeRotation(id, rotation);
  // Barra de transferência não tem tensão própria fixa: só assume a cor
  // (azul/etc conforme o nível) quando um caminho fechado a energiza de fato
  // (`energizedTensao`, calculado em Canvas.tsx); fora disso fica cinza.
  const color =
    data.tipo === "transferencia"
      ? data.energizedTensao !== undefined
        ? VOLTAGE_COLORS[data.energizedTensao]
        : WIRE_UNCONNECTED_STROKE
      : VOLTAGE_COLORS[data.tensao];
  const width = STROKE_WIDTH[data.tipo];
  const isHorizontal = rotation === 90 || rotation === 270;
  const handles = data.handles ?? [];
  const length = computeBarraLength(handles.length);

  // Handles dinâmicos são criados em runtime (ver Correção 3) — o React Flow só
  // registra a posição de um handle novo no node depois de remedir o DOM. O
  // comprimento da barra também muda junto (cresce com o nº de circuitos), então
  // precisa remedir nos dois casos — ambos derivam de handles.length.
  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, handles.length, updateNodeInternals]);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: isHorizontal ? length : width, height: isHorizontal ? width : length }}
    >
      <div style={wrapperStyle}>
        <div
          className={`rounded-full ${selected ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
          style={{ width, height: length, backgroundColor: color }}
        />
      </div>

      {/* Área clicável mais larga que a barra em si (fina demais pra clicar
          com precisão), centrada nela — a metade de cada lado decide se o
          handle novo sai pelo início ou fim (ver Canvas.tsx). */}
      <div
        data-barra-id={id}
        className="absolute"
        style={{
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: isHorizontal ? length : HIT_AREA_WIDTH,
          height: isHorizontal ? HIT_AREA_WIDTH : length,
        }}
      />

      {handles.map((h) => {
        const lado = h.lado ?? "fim";
        const position = getBarraHandlePosition(rotation, lado);
        const cross = lado === "inicio" ? `${-HANDLE_GAP}px` : `calc(100% + ${HANDLE_GAP}px)`;
        return (
          <Handle
            key={h.id}
            id={h.id}
            type="source"
            position={position}
            style={
              isHorizontal
                ? { left: `${h.position * 100}%`, top: cross, transform: "translate(-50%, -50%)" }
                : { top: `${h.position * 100}%`, left: cross, transform: "translate(-50%, -50%)" }
            }
            className="!z-10 !bg-slate-700"
          />
        );
      })}

      <span
        className="absolute flex items-center gap-1 whitespace-nowrap text-[9px] font-semibold"
        style={{ ...LABEL_POSITION, color }}
      >
        {data.fonte && <span title="Barra fonte">⚡</span>}
        {data.nome} — {data.tensao} kV
      </span>
    </div>
  );
}
