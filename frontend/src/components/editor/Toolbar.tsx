import type { DragEvent } from "react";
import type { EquipmentKind } from "../../types/topology";

const COMPONENTS: { kind: EquipmentKind; label: string; symbol: string }[] = [
  { kind: "barra", label: "Barra", symbol: "▬" },
  { kind: "disjuntor", label: "Disjuntor", symbol: "⊠" },
  { kind: "chave", label: "Chave", symbol: "∕" },
  { kind: "transformador", label: "Transformador", symbol: "◎" },
  { kind: "religador", label: "Religador", symbol: "®" },
  { kind: "tp", label: "TP", symbol: "T" },
  { kind: "tc", label: "TC", symbol: "T" },
  { kind: "linha", label: "Linha", symbol: "→" },
];

export function Toolbar() {
  function handleDragStart(event: DragEvent, kind: EquipmentKind) {
    event.dataTransfer.setData("application/x-equipment-kind", kind);
    event.dataTransfer.effectAllowed = "move";
  }

  return (
    <aside className="w-48 shrink-0 border-r border-slate-200 bg-white">
      <h2 className="border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Componentes
      </h2>
      <ul>
        {COMPONENTS.map((item) => (
          <li key={item.kind}>
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, item.kind)}
              className="flex cursor-grab items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 active:cursor-grabbing"
            >
              <span className="w-5 text-center text-slate-500">{item.symbol}</span>
              {item.label}
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
