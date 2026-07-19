import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { substationsService } from "../services/substations";

export function SubstationsHomePage() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [sigla, setSigla] = useState("");
  const queryClient = useQueryClient();

  const { data: substations, isLoading, isError } = useQuery({
    queryKey: ["substations"],
    queryFn: substationsService.list,
  });

  const createMutation = useMutation({
    mutationFn: substationsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["substations"] });
      setName("");
      setSigla("");
      setShowForm(false);
    },
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    createMutation.mutate({ name, sigla });
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Subestações</h1>
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? "Cancelar" : "Nova subestação"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 flex gap-3 rounded-md border border-slate-200 p-4">
          <input
            required
            placeholder="Nome (ex: SE Curitiba Batel)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            required
            placeholder="Sigla (ex: SE-CTB)"
            value={sigla}
            onChange={(e) => setSigla(e.target.value)}
            className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending ? "Criando..." : "Criar"}
          </button>
        </form>
      )}

      {createMutation.isError && (
        <p className="mb-4 text-sm text-red-600">Erro ao criar subestação. Verifique se a sigla já existe.</p>
      )}

      {isLoading && <p className="text-slate-500">Carregando...</p>}
      {isError && <p className="text-red-600">Erro ao carregar subestações.</p>}

      {substations && substations.length === 0 && (
        <p className="text-slate-500">Nenhuma subestação cadastrada ainda.</p>
      )}

      <ul className="divide-y divide-slate-200 rounded-md border border-slate-200">
        {substations?.map((substation) => (
          <li key={substation.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium text-slate-900">{substation.name}</p>
              <p className="text-sm text-slate-500">{substation.sigla}</p>
            </div>
            <span className="text-sm text-slate-400">v{substation.version}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
