import { useManeuverStore } from "../../stores/maneuverStore";

const ACTION_BADGE: Record<string, string> = {
  ABRIR: "bg-emerald-50 text-emerald-700",
  FECHAR: "bg-red-50 text-red-700",
};

export function StepsPanel() {
  const steps = useManeuverStore((s) => s.steps);

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white">
      <h2 className="border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Passos da manobra
      </h2>
      {steps.length === 0 ? (
        <p className="p-3 text-sm text-slate-400">Nenhum passo registrado ainda. Clique num DJ, CH ou Religador no canvas.</p>
      ) : (
        <ol className="divide-y divide-slate-100">
          {steps.map((step) => (
            <li key={step.id} className="flex items-start gap-2 px-3 py-2 text-sm text-slate-700">
              <span className="mt-0.5 shrink-0 text-xs font-semibold text-slate-400">{step.order}.</span>
              <div className="flex-1">
                <p>{step.description}</p>
                {step.action && (
                  <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${ACTION_BADGE[step.action]}`}>
                    {step.action}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
