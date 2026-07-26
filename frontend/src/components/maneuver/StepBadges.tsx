import type { ManeuverStep } from "../../types/maneuver";

const ACTION_BADGE: Record<string, string> = {
  ABRIR: "bg-emerald-50 text-emerald-700",
  FECHAR: "bg-red-50 text-red-700",
};

/** Badges de ação (ABRIR/FECHAR) e origem (manual) de um passo — usado tanto
 *  no painel de edição (StepsPanel) quanto na visualização do histórico
 *  (ManeuverDetailPage), que precisam mostrar exatamente a mesma coisa. */
export function StepBadges({ step }: { step: Pick<ManeuverStep, "action" | "origin"> }) {
  return (
    <>
      {step.action && (
        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${ACTION_BADGE[step.action]}`}>
          {step.action}
        </span>
      )}
      {step.origin === "MANUAL" && (
        <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
          manual
        </span>
      )}
    </>
  );
}
