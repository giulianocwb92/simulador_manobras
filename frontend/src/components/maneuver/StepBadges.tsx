import type { ManeuverStep } from "../../types/maneuver";

const ACTION_BADGE: Record<string, string> = {
  ABRIR: "bg-emerald-50 text-emerald-700",
  FECHAR: "bg-red-50 text-red-700",
};

const RESPONSIBILITY_BADGE: Record<string, string> = {
  LOCAL: "bg-amber-50 text-amber-700",
  CENTRO: "bg-slate-100 text-slate-500",
};

/** Badges de um passo — ação (ABRIR/FECHAR, ausente em passo manual) e
 *  responsabilidade (LOCAL/CENTRO) — usado tanto no painel simplificado do
 *  editor (StepsPanel) quanto na visualização do histórico (ManeuverDetailPage),
 *  que precisam mostrar exatamente a mesma coisa. */
export function StepBadges({ step }: { step: Pick<ManeuverStep, "action" | "responsibility"> }) {
  return (
    <>
      {step.action && (
        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${ACTION_BADGE[step.action]}`}>
          {step.action}
        </span>
      )}
      <span
        className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${RESPONSIBILITY_BADGE[step.responsibility]}`}
      >
        {step.responsibility}
      </span>
    </>
  );
}
