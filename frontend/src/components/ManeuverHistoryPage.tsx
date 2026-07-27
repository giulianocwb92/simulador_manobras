import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { maneuversService, type ManeuverListFilters } from "../services/maneuvers";
import { substationsService } from "../services/substations";

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO: "Rascunho",
  FINALIZADA: "Finalizada",
};

export function ManeuverHistoryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [seId, setSeId] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const filters: ManeuverListFilters = {
    status: "FINALIZADA",
    se_id: seId || undefined,
    responsavel: responsavel || undefined,
    data_inicio: dataInicio || undefined,
    data_fim: dataFim || undefined,
  };

  const { data: maneuvers, isLoading } = useQuery({
    queryKey: ["maneuvers", filters],
    queryFn: () => maneuversService.list(filters),
  });

  const { data: substations } = useQuery({
    queryKey: ["substations"],
    queryFn: substationsService.list,
  });

  const cloneMutation = useMutation({
    mutationFn: (id: string) => maneuversService.clone(id),
    onSuccess: (clone) => {
      queryClient.invalidateQueries({ queryKey: ["maneuvers"] });
      navigate(`/manobras/${clone.id}`);
    },
  });

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
            ← Início
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Histórico de manobras</h1>
        </div>
        <Link
          to="/manobras/nova"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Nova Sessão de Manobra
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 rounded-md border border-slate-200 p-4 sm:grid-cols-4">
        <label className="text-xs text-slate-600">
          Subestação
          <select
            value={seId}
            onChange={(e) => setSeId(e.target.value)}
            className="mt-0.5 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">Todas</option>
            {substations?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-600">
          Responsável
          <input
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            placeholder="Nome..."
            className="mt-0.5 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-slate-600">
          Data (de)
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="mt-0.5 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-slate-600">
          Data (até)
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="mt-0.5 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      {isLoading && <p className="text-slate-500">Carregando...</p>}
      {maneuvers && maneuvers.length === 0 && (
        <p className="text-slate-500">Nenhuma manobra finalizada encontrada com esses filtros.</p>
      )}

      <ul className="flex flex-col gap-3">
        {maneuvers?.map((maneuver) => (
          <li key={maneuver.id} className="rounded-md border border-slate-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-slate-900">{maneuver.title}</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {maneuver.substation_names.length > 0 ? maneuver.substation_names.join(", ") : "—"}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {maneuver.header.responsavel ?? "sem responsável"} · {maneuver.header.data ?? "sem data"}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {STATUS_LABEL[maneuver.status] ?? maneuver.status}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3 text-sm">
              <Link to={`/manobras/${maneuver.id}`} className="text-blue-600 hover:text-blue-800">
                Visualizar
              </Link>
              <a href={maneuversService.pdfUrl(maneuver.id)} className="text-blue-600 hover:text-blue-800">
                Baixar PDF
              </a>
              <button
                type="button"
                onClick={() => cloneMutation.mutate(maneuver.id)}
                disabled={cloneMutation.isPending}
                className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                Clonar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
