import { useState } from "react";
import { Link } from "react-router-dom";
import { useManeuverStore } from "../../stores/maneuverStore";
import { maneuversService } from "../../services/maneuvers";
import { StepBadges } from "./StepBadges";

interface StepsPanelProps {
  /** true durante GRAVANDO (passos chegam sozinhos, ver handleEquipmentToggle
   *  em SubstationEditorPage.tsx) ou depois que a manobra foi finalizada no
   *  backend — nesses casos não faz sentido excluir passo nem editar a manobra. */
  readOnly?: boolean;
}

/** Painel lateral somente leitura: mostra os passos registrados (com badges
 *  de ação/responsabilidade) e permite excluir um passo ou navegar pra edição
 *  completa/PDF — toda edição de texto, reordenação e cabeçalho vive em
 *  `ManeuverEditPage` (`/manobras/:id/editar`), não aqui. */
export function StepsPanel({ readOnly = false }: StepsPanelProps) {
  const maneuverId = useManeuverStore((s) => s.maneuverId);
  const steps = useManeuverStore((s) => s.steps);
  const removeStep = useManeuverStore((s) => s.removeStep);

  const [error, setError] = useState<string | null>(null);

  async function handleDelete(stepId: string) {
    if (!window.confirm("Excluir este passo da manobra?")) return;
    removeStep(stepId);
    if (!maneuverId) return;
    try {
      await maneuversService.deleteStep(maneuverId, stepId);
    } catch {
      setError("Não foi possível remover o passo.");
    }
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
        <p className="p-3 text-sm text-slate-400">Nenhum passo registrado ainda.</p>
      ) : (
        <ol className="divide-y divide-slate-100">
          {steps.map((step) => (
            <li key={step.id} className="flex items-start gap-2 px-3 py-2 text-sm text-slate-700">
              <span className="mt-0.5 shrink-0 text-xs font-semibold text-slate-400">{step.order}.</span>
              <div className="flex-1">
                <p>{step.description}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <StepBadges step={step} />
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleDelete(step.id)}
                      className="ml-auto text-[10px] text-red-400 hover:text-red-600"
                    >
                      excluir
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {maneuverId && (
        <div className="mt-auto flex flex-col gap-1.5 border-t border-slate-100 p-3">
          {!readOnly && (
            <Link
              to={`/manobras/${maneuverId}/editar`}
              className="rounded-md bg-slate-700 px-3 py-1.5 text-center text-xs font-medium text-white hover:bg-slate-800"
            >
              Editar Manobra
            </Link>
          )}
          <Link
            to={`/manobras/${maneuverId}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-center text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Visualizar PDF
          </Link>
        </div>
      )}
    </div>
  );
}
