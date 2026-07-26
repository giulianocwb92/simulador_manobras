import { Handle, type NodeProps } from "@xyflow/react";
import type { Rotation, TF3NodeType } from "../types/topology";
import { getTerminalPosition } from "../utils/edgePositions";
import { LABEL_POSITION } from "../utils/labelPosition";
import { useNodeRotation } from "./useNodeRotation";

// Terminais a/b ficam alinhados com o par de enrolamentos superior, não com o
// centro geométrico da caixa (y=20 de uma viewBox 56 alto → 8 unidades acima
// do centro=28, convertido pra px físicos). Os dois terminais têm o MESMO
// desvio (ambos saem na mesma altura do par de enrolamentos) — não é espelhado
// entre eles. Como os Handles ficam fora do wrapper rotacionado, esse desvio
// "pra cima" (no desenho original, rotação 0°) precisa ser rotacionado junto
// com o componente pra continuar apontando pro par de enrolamentos em
// qualquer ângulo: 0°→topo do eixo cruzado, 90°→direita, 180°→baixo, 270°→esquerda.
// Arredondado pra pixel inteiro — todo outro Handle da aplicação usa o
// centro padrão (50%) do React Flow, que sempre cai em número inteiro nas
// caixas usadas aqui; um offset fracionário só neste componente faria seus
// terminais não alinharem na mesma "linha de pixel" dos demais.
const LATERAL_OFFSET_PX = Math.round((8 * 34) / 56);
// Tamanho do eixo cruzado (perpendicular à linha a-b) é sempre `baseHeight`
// (34px) — em 0°/180° isso é a altura do container; em 90°/270° é a largura
// (o container troca de eixo, mas o tamanho cruzado continua o mesmo).
const CROSS_CENTER_PX = 34 / 2;

function terminalAbOffset(rotation: Rotation): { top: number } | { left: number } {
  switch (rotation) {
    case 0:
      return { top: CROSS_CENTER_PX - LATERAL_OFFSET_PX };
    case 90:
      return { left: CROSS_CENTER_PX + LATERAL_OFFSET_PX };
    case 180:
      return { top: CROSS_CENTER_PX + LATERAL_OFFSET_PX };
    case 270:
      return { left: CROSS_CENTER_PX - LATERAL_OFFSET_PX };
  }
}

export function TF3Node({ id, data, selected }: NodeProps<TF3NodeType>) {
  const rotation = data.rotation ?? 0;
  const { containerStyle, wrapperStyle } = useNodeRotation(id, rotation, 48, 34);
  const posA = getTerminalPosition("tf3", "terminal-a", rotation);
  const posB = getTerminalPosition("tf3", "terminal-b", rotation);
  const posTer = getTerminalPosition("tf3", "terminal-ter", rotation);
  const abOffset = terminalAbOffset(rotation);

  return (
    <div
      className={`relative flex items-center justify-center ${selected ? "rounded-sm ring-2 ring-blue-500 ring-offset-1" : ""}`}
      style={containerStyle}
    >
      <Handle id="terminal-a" type="source" position={posA} style={abOffset} className="!z-10 !bg-slate-600" />
      <div style={wrapperStyle}>
        <svg viewBox="0 0 80 56" className="h-full w-full">
          <line x1="0" y1="20" x2="24" y2="20" stroke="#000000" strokeWidth="2" />
          <line x1="56" y1="20" x2="80" y2="20" stroke="#000000" strokeWidth="2" />
          <line x1="40" y1="46" x2="40" y2="56" stroke="#000000" strokeWidth="2" />
          <circle cx="34" cy="20" r="12" fill="none" stroke="#000000" strokeWidth="2" />
          <circle cx="46" cy="20" r="12" fill="none" stroke="#000000" strokeWidth="2" />
          <circle cx="40" cy="34" r="12" fill="none" stroke="#000000" strokeWidth="2" />
        </svg>
      </div>
      <Handle id="terminal-b" type="source" position={posB} style={abOffset} className="!z-10 !bg-slate-600" />
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
