import { useState, type FormEvent } from "react";
import { VOLTAGE_LEVELS, type BarraTipo, type EquipmentKind, type VoltageLevel } from "../../types/topology";

export interface PropertiesModalSubmitPayload {
  label: string;
  data: Record<string, unknown>;
}

interface PropertiesModalProps {
  kind: EquipmentKind;
  initialData?: Record<string, unknown>;
  substationOptions?: { id: string; name: string }[];
  onSubmit: (payload: PropertiesModalSubmitPayload) => void;
  onCancel: () => void;
}

const KIND_TITLES: Record<EquipmentKind, string> = {
  barra: "Barra",
  disjuntor: "Disjuntor",
  chave: "Chave",
  transformador: "Transformador",
  tf3: "Transformador 3 Enrolamentos",
  religador: "Religador",
  tp: "TP",
  tc: "TC",
  linha: "Linha",
};

const BARRA_TIPO_LABELS: Record<BarraTipo, string> = {
  principal: "Principal",
  transferencia: "Transferência",
  dupla: "Dupla",
};

export function PropertiesModal({
  kind,
  initialData,
  substationOptions = [],
  onSubmit,
  onCancel,
}: PropertiesModalProps) {
  const [nome, setNome] = useState((initialData?.nome as string) ?? "");
  const [numero, setNumero] = useState((initialData?.numero as string) ?? "");
  const [identificador, setIdentificador] = useState((initialData?.identificador as string) ?? "");
  const [estado, setEstado] = useState<"aberto" | "fechado">(
    (initialData?.estado as "aberto" | "fechado") ?? "fechado"
  );
  const [tensao, setTensao] = useState<VoltageLevel>((initialData?.tensao as VoltageLevel) ?? 138);
  const [tensaoAt, setTensaoAt] = useState<VoltageLevel>((initialData?.tensao_at as VoltageLevel) ?? 138);
  const [tensaoBt, setTensaoBt] = useState<VoltageLevel>((initialData?.tensao_bt as VoltageLevel) ?? 13.8);
  const [tensaoTer, setTensaoTer] = useState<VoltageLevel>((initialData?.tensao_ter as VoltageLevel) ?? 13.8);
  const [potenciaMva, setPotenciaMva] = useState(
    initialData?.potencia_mva !== undefined ? String(initialData.potencia_mva) : ""
  );
  const [destinoSeId, setDestinoSeId] = useState((initialData?.destino_se_id as string) ?? "");
  const [barraTipo, setBarraTipo] = useState<BarraTipo>((initialData?.tipo as BarraTipo) ?? "principal");
  const [fonte, setFonte] = useState((initialData?.fonte as boolean) ?? false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (kind === "barra") {
      onSubmit({ label: nome, data: { nome, tensao, tipo: barraTipo, fonte } });
      return;
    }
    if (kind === "disjuntor") {
      const label = `DJ 52-${numero}`;
      onSubmit({ label, data: { label, numero, estado } });
      return;
    }
    if (kind === "chave") {
      const label = `CH 29-${numero}`;
      onSubmit({ label, data: { label, numero, estado } });
      return;
    }
    if (kind === "religador") {
      const label = `Religador ${nome}`;
      onSubmit({ label, data: { label, nome, estado } });
      return;
    }
    if (kind === "transformador") {
      const label = `TF-${identificador}`;
      onSubmit({
        label,
        data: {
          label,
          identificador,
          tensao_at: tensaoAt,
          tensao_bt: tensaoBt,
          potencia_mva: potenciaMva ? Number(potenciaMva) : undefined,
        },
      });
      return;
    }
    if (kind === "tf3") {
      const label = `TF-${identificador}`;
      onSubmit({
        label,
        data: {
          label,
          identificador,
          tensao_at: tensaoAt,
          tensao_bt: tensaoBt,
          tensao_ter: tensaoTer,
          potencia_mva: potenciaMva ? Number(potenciaMva) : undefined,
        },
      });
      return;
    }
    if (kind === "tp" || kind === "tc") {
      const label = `${kind.toUpperCase()}${numero ? ` ${numero}` : ""}`;
      onSubmit({ label, data: { label } });
      return;
    }
    if (kind === "linha") {
      const destino = substationOptions.find((s) => s.id === destinoSeId);
      onSubmit({
        label: nome,
        data: { label: nome, nome, destino_se_id: destinoSeId || null, destino_se_nome: destino?.name ?? null },
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <form onSubmit={handleSubmit} className="w-80 rounded-lg bg-white p-5 shadow-lg">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">{KIND_TITLES[kind]}</h2>

        {(kind === "barra" || kind === "religador" || kind === "linha") && (
          <label className="mb-3 block text-sm">
            {kind === "linha" ? "Nome da linha" : "Nome"}
            <input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        )}

        {(kind === "disjuntor" || kind === "chave") && (
          <label className="mb-3 block text-sm">
            Número (ex: 01)
            <input
              required
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        )}

        {(kind === "tp" || kind === "tc") && (
          <label className="mb-3 block text-sm">
            Identificação (opcional)
            <input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        )}

        {kind === "barra" && (
          <>
            <label className="mb-3 block text-sm">
              Tipo
              <select
                value={barraTipo}
                onChange={(e) => setBarraTipo(e.target.value as BarraTipo)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {(Object.keys(BARRA_TIPO_LABELS) as BarraTipo[]).map((t) => (
                  <option key={t} value={t}>
                    {BARRA_TIPO_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="mb-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={fonte} onChange={(e) => setFonte(e.target.checked)} />
              Barra fonte (⚡ inicia propagação de cor)
            </label>
          </>
        )}

        {(kind === "disjuntor" || kind === "chave" || kind === "religador") && (
          <label className="mb-3 block text-sm">
            Estado inicial
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as "aberto" | "fechado")}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="fechado">Fechado</option>
              <option value="aberto">Aberto</option>
            </select>
          </label>
        )}

        {kind === "barra" && (
          <label className="mb-3 block text-sm">
            Nível de tensão
            <select
              value={tensao}
              onChange={(e) => setTensao(Number(e.target.value) as VoltageLevel)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {VOLTAGE_LEVELS.map((v) => (
                <option key={v} value={v}>
                  {v} kV
                </option>
              ))}
            </select>
          </label>
        )}

        {(kind === "transformador" || kind === "tf3") && (
          <>
            <label className="mb-3 block text-sm">
              Identificador (letra ou número)
              <input
                required
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                placeholder="A ou 01"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="mb-3 block text-sm">
              Tensão AT
              <select
                value={tensaoAt}
                onChange={(e) => setTensaoAt(Number(e.target.value) as VoltageLevel)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {VOLTAGE_LEVELS.map((v) => (
                  <option key={v} value={v}>
                    {v} kV
                  </option>
                ))}
              </select>
            </label>
            <label className="mb-3 block text-sm">
              Tensão BT
              <select
                value={tensaoBt}
                onChange={(e) => setTensaoBt(Number(e.target.value) as VoltageLevel)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {VOLTAGE_LEVELS.map((v) => (
                  <option key={v} value={v}>
                    {v} kV
                  </option>
                ))}
              </select>
            </label>
            {kind === "tf3" && (
              <label className="mb-3 block text-sm">
                Tensão terciário
                <select
                  value={tensaoTer}
                  onChange={(e) => setTensaoTer(Number(e.target.value) as VoltageLevel)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  {VOLTAGE_LEVELS.map((v) => (
                    <option key={v} value={v}>
                      {v} kV
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="mb-3 block text-sm">
              Potência (MVA)
              <input
                type="number"
                step="0.1"
                value={potenciaMva}
                onChange={(e) => setPotenciaMva(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </>
        )}

        {kind === "linha" && (
          <label className="mb-3 block text-sm">
            SE destino
            <select
              value={destinoSeId}
              onChange={(e) => setDestinoSeId(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">— nenhuma —</option>
              {substationOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}
