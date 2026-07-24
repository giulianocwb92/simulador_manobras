import type { DragEvent } from "react";
import { useEditorStore } from "../../stores/editorStore";
import type { EquipmentKind } from "../../types/topology";

interface ComponentItem {
  kind: EquipmentKind;
  label: string;
  symbol: string;
}

const SECTIONS: { title: string; items: ComponentItem[] }[] = [
  {
    title: "Barras",
    items: [{ kind: "barra", label: "Barra", symbol: "▬▬" }],
  },
  {
    title: "Equipamentos",
    items: [
      { kind: "disjuntor", label: "Disjuntor", symbol: "⊠" },
      { kind: "chave", label: "Chave Seccionadora", symbol: "∕" },
      { kind: "religador", label: "Religador", symbol: "⊠R" },
    ],
  },
  {
    title: "Transformadores",
    items: [
      { kind: "transformador", label: "TF 2 Enrolamentos", symbol: "◎" },
      { kind: "tf3", label: "TF 3 Enrolamentos", symbol: "◉" },
      { kind: "tp", label: "Transf. Potencial", symbol: "TP" },
      { kind: "tc", label: "Transf. Corrente", symbol: "TC" },
    ],
  },
  {
    title: "Linhas",
    items: [{ kind: "linha", label: "Linha", symbol: "→" }],
  },
];

export function Toolbar() {
  const nodes = useEditorStore((s) => s.nodes);
  const rotateSelectedNodes = useEditorStore((s) => s.rotateSelectedNodes);
  const hasSelection = nodes.some((n) => n.selected);

  function handleDragStart(event: DragEvent, kind: EquipmentKind) {
    event.dataTransfer.setData("application/x-equipment-kind", kind);
    event.dataTransfer.effectAllowed = "move";
  }

  return (
    <aside className="w-48 shrink-0 overflow-y-auto border-r border-slate-200 bg-white">
      <h2 className="border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Componentes
      </h2>
      <button
        type="button"
        onClick={() => rotateSelectedNodes()}
        disabled={!hasSelection}
        className="flex w-full items-center gap-2 border-b border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
      >
        <span className="w-5 text-center">↻</span>
        Rotacionar
      </button>
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <h3 className="border-b border-slate-100 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {section.title}
          </h3>
          <ul>
            {section.items.map((item) => (
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
        </div>
      ))}
    </aside>
  );
}
