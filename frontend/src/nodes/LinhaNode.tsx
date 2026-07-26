import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { LinhaNodeType } from "../types/topology";

export function LinhaNode({ data, selected }: NodeProps<LinhaNodeType>) {
  return (
    <div className="relative h-6 w-8">
      <Handle id="terminal-a" type="source" position={Position.Left} className="!z-10 !bg-slate-600" />
      {/* viewBox 64x48 (proporção 4:3) casa exatamente com a caixa 32x24 (w-8
          h-6, mesma proporção 4:3) — evita o letterbox que o SVG aplicaria
          pra preservar a proporção com um viewBox desproporcional (era 64x40,
          16:10), cujo cálculo de centralização introduzia ~1px de
          arredondamento entre a linha desenhada e o Handle (que é
          posicionado por CSS `top:50%`, sem letterbox). */}
      <svg viewBox="0 0 64 48" className="h-6 w-8">
        <line
          x1="0"
          y1="24"
          x2="40"
          y2="24"
          stroke={selected ? "#2563eb" : "#334155"}
          strokeWidth="2"
        />
        <path d="M36 16 L58 24 L36 32 Z" fill={selected ? "#2563eb" : "#334155"} />
      </svg>
      <div className="absolute top-full flex flex-col items-center whitespace-nowrap text-center" style={{ left: "50%", transform: "translateX(-50%)", marginTop: 2 }}>
        <span className="text-[9px] font-medium text-slate-600">{data.nome}</span>
        {data.destino_se_nome && <span className="text-[9px] text-slate-400">→ {data.destino_se_nome}</span>}
      </div>
    </div>
  );
}
