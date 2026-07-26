import { useState } from "react";
import { useManeuverStore } from "../../stores/maneuverStore";
import { maneuversService } from "../../services/maneuvers";
import type { ManeuverHeader } from "../../types/maneuver";

interface ManeuverHeaderFormProps {
  readOnly?: boolean;
}

const FIELDS: { key: keyof ManeuverHeader; label: string; type?: string }[] = [
  { key: "numero", label: "Número (ex: MAN-2026-001)" },
  { key: "data", label: "Data", type: "date" },
  { key: "responsavel", label: "Responsável" },
  { key: "area", label: "Área" },
];

export function ManeuverHeaderForm({ readOnly = false }: ManeuverHeaderFormProps) {
  const maneuverId = useManeuverStore((s) => s.maneuverId);
  const header = useManeuverStore((s) => s.header);
  const setHeaderLocal = useManeuverStore((s) => s.setHeader);
  const [error, setError] = useState<string | null>(null);

  async function persist(patch: Partial<ManeuverHeader>) {
    setHeaderLocal(patch);
    if (!maneuverId) return;
    try {
      await maneuversService.updateHeader(maneuverId, { ...header, ...patch });
    } catch {
      setError("Não foi possível salvar o cabeçalho.");
    }
  }

  return (
    <div className="border-b border-slate-100 p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Cabeçalho da manobra</h3>
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      <div className="flex flex-col gap-2">
        {FIELDS.map((field) => (
          <label key={field.key} className="text-xs text-slate-600">
            {field.label}
            <input
              type={field.type ?? "text"}
              defaultValue={(header[field.key] as string) ?? ""}
              disabled={readOnly}
              onBlur={(e) => persist({ [field.key]: e.target.value || null })}
              className="mt-0.5 w-full rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50 disabled:text-slate-400"
            />
          </label>
        ))}
        <label className="text-xs text-slate-600">
          Descrição do isolamento
          <textarea
            defaultValue={header.descricao_isolamento ?? ""}
            disabled={readOnly}
            onBlur={(e) => persist({ descricao_isolamento: e.target.value || null })}
            rows={3}
            className="mt-0.5 w-full resize-none rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50 disabled:text-slate-400"
          />
        </label>
      </div>
    </div>
  );
}
