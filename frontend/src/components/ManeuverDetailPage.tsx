import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { maneuversService } from "../services/maneuvers";
import { StepBadges } from "./maneuver/StepBadges";

const FIELD_LABELS: { key: "data" | "responsavel" | "area"; label: string }[] = [
  { key: "data", label: "Data" },
  { key: "responsavel", label: "Responsável" },
  { key: "area", label: "Área" },
];

export function ManeuverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: maneuver, isLoading } = useQuery({
    queryKey: ["maneuvers", id],
    queryFn: () => maneuversService.get(id!),
    enabled: !!id,
  });

  const cloneMutation = useMutation({
    mutationFn: () => maneuversService.clone(id!),
    onSuccess: (clone) => {
      queryClient.invalidateQueries({ queryKey: ["maneuvers"] });
      navigate(`/manobras/${clone.id}`);
    },
  });

  if (isLoading) return <p className="p-8 text-slate-500">Carregando...</p>;
  if (!maneuver) return <p className="p-8 text-slate-500">Manobra não encontrada.</p>;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link to="/manobras" className="text-sm text-slate-500 hover:text-slate-700">
            ← Histórico de manobras
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{maneuver.title}</h1>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {maneuver.status === "FINALIZADA" ? "Finalizada" : "Rascunho"}
        </span>
      </div>

      <div className="mb-6 flex items-center gap-3">
        {maneuver.status !== "FINALIZADA" && (
          <Link
            to={`/manobras/${maneuver.id}/editar`}
            className="rounded-md bg-slate-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            Editar
          </Link>
        )}
        <Link
          to={`/manobras/${maneuver.id}/pdf`}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          Visualizar PDF
        </Link>
        <button
          type="button"
          onClick={() => cloneMutation.mutate()}
          disabled={cloneMutation.isPending}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {cloneMutation.isPending ? "Clonando..." : "Clonar"}
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 rounded-md border border-slate-200 p-4 sm:grid-cols-4">
        <div>
          <p className="text-xs font-medium text-slate-500">Número</p>
          <p className="text-sm text-slate-900">{maneuver.number ?? "—"}</p>
        </div>
        {FIELD_LABELS.map((field) => (
          <div key={field.key}>
            <p className="text-xs font-medium text-slate-500">{field.label}</p>
            <p className="text-sm text-slate-900">{maneuver.header[field.key] ?? "—"}</p>
          </div>
        ))}
        <div className="col-span-2 sm:col-span-4">
          <p className="text-xs font-medium text-slate-500">Subestações</p>
          <p className="text-sm text-slate-900">
            {maneuver.substation_names.length > 0 ? maneuver.substation_names.join(", ") : "—"}
          </p>
        </div>
        {maneuver.header.descricao_isolamento && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs font-medium text-slate-500">Descrição do isolamento</p>
            <p className="whitespace-pre-wrap text-sm text-slate-900">{maneuver.header.descricao_isolamento}</p>
          </div>
        )}
      </div>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Passos da manobra</h2>
      {maneuver.steps.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum passo registrado.</p>
      ) : (
        <ol className="divide-y divide-slate-100 rounded-md border border-slate-200">
          {maneuver.steps.map((step) => (
            <li key={step.id} className="flex items-start gap-2 px-3 py-2 text-sm text-slate-700">
              <span className="mt-0.5 shrink-0 text-xs font-semibold text-slate-400">{step.order}.</span>
              <div className="flex-1">
                <p>{step.description}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <StepBadges step={step} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
