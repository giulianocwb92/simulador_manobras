import { useState, type DragEvent, type FormEvent } from "react";
import { useManeuverStore } from "../../stores/maneuverStore";
import { maneuversService } from "../../services/maneuvers";
import { StepBadges } from "./StepBadges";

interface StepsPanelProps {
  /** true durante GRAVANDO (só leitura) ou depois que a manobra foi finalizada no
   *  backend — nesses casos não faz sentido reordenar/editar/deletar/adicionar. */
  readOnly?: boolean;
}

export function StepsPanel({ readOnly = false }: StepsPanelProps) {
  const maneuverId = useManeuverStore((s) => s.maneuverId);
  const steps = useManeuverStore((s) => s.steps);
  const updateStep = useManeuverStore((s) => s.updateStep);
  const removeStep = useManeuverStore((s) => s.removeStep);
  const reorderSteps = useManeuverStore((s) => s.reorderSteps);
  const addStep = useManeuverStore((s) => s.addStep);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [manualText, setManualText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleDescriptionBlur(stepId: string, value: string, original: string) {
    if (value === original) return;
    updateStep(stepId, value);
    if (!maneuverId) return;
    try {
      await maneuversService.updateStep(maneuverId, stepId, value);
    } catch {
      setError("Não foi possível salvar a edição do passo.");
    }
  }

  async function handleDelete(stepId: string) {
    removeStep(stepId);
    if (!maneuverId) return;
    try {
      await maneuversService.deleteStep(maneuverId, stepId);
    } catch {
      setError("Não foi possível remover o passo.");
    }
  }

  function handleDragStart(stepId: string) {
    setDraggedId(stepId);
  }

  async function handleDrop(event: DragEvent, targetId: string) {
    event.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    const ids = steps.map((s) => s.id);
    const fromIndex = ids.indexOf(draggedId);
    const toIndex = ids.indexOf(targetId);
    ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, draggedId);
    reorderSteps(ids);
    setDraggedId(null);
    if (!maneuverId) return;
    try {
      await maneuversService.reorderSteps(maneuverId, ids);
    } catch {
      setError("Não foi possível salvar a nova ordem dos passos.");
    }
  }

  async function handleAddManual(event: FormEvent) {
    event.preventDefault();
    const description = manualText.trim();
    if (!description) return;
    setManualText("");
    if (maneuverId) {
      try {
        const persisted = await maneuversService.addStep(maneuverId, { description, origin: "MANUAL" });
        addStep(persisted);
        return;
      } catch {
        setError("Não foi possível salvar o passo manual.");
      }
    }
    addStep({ id: crypto.randomUUID(), order: steps.length + 1, description, equipment_id: null, action: null, origin: "MANUAL" });
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <h2 className="border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Passos da manobra
      </h2>

      {error && (
        <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700">
          {error}
          <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            ✕
          </button>
        </div>
      )}

      {steps.length === 0 ? (
        <p className="p-3 text-sm text-slate-400">
          {readOnly ? "Nenhum passo registrado ainda." : "Nenhum passo ainda. Adicione um passo manual abaixo."}
        </p>
      ) : (
        <ol className="divide-y divide-slate-100">
          {steps.map((step) => (
            <li
              key={step.id}
              draggable={!readOnly}
              onDragStart={() => handleDragStart(step.id)}
              onDragOver={(e) => !readOnly && e.preventDefault()}
              onDrop={(e) => !readOnly && handleDrop(e, step.id)}
              className={`flex items-start gap-2 px-3 py-2 text-sm text-slate-700 ${!readOnly ? "cursor-grab active:cursor-grabbing" : ""}`}
            >
              <span className="mt-0.5 shrink-0 text-xs font-semibold text-slate-400">{step.order}.</span>
              <div className="flex-1">
                {readOnly ? (
                  <p>{step.description}</p>
                ) : (
                  <textarea
                    defaultValue={step.description}
                    onBlur={(e) => handleDescriptionBlur(step.id, e.target.value, step.description)}
                    rows={2}
                    className="w-full resize-none rounded border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-slate-200 focus:border-blue-400 focus:bg-white focus:outline-none"
                  />
                )}
                <div className="mt-1 flex items-center gap-1.5">
                  <StepBadges step={step} />
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleDelete(step.id)}
                      className="ml-auto text-[10px] text-red-400 hover:text-red-600"
                    >
                      remover
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {!readOnly && (
        <form onSubmit={handleAddManual} className="flex flex-col gap-1.5 border-t border-slate-100 p-3">
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Passo manual (texto livre)..."
            rows={2}
            className="resize-none rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            disabled={!manualText.trim()}
            className="self-end rounded-md bg-slate-700 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Adicionar passo
          </button>
        </form>
      )}
    </div>
  );
}
