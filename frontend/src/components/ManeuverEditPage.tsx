import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { maneuversService } from "../services/maneuvers";
import { StepBadges } from "./maneuver/StepBadges";
import type { ManeuverHeader, ManeuverStep, ManeuverStepResponsibility } from "../types/maneuver";

const AUTO_SAVE_DELAY_MS = 2000;

const RESPONSIBILITY_OPTIONS: ManeuverStepResponsibility[] = ["CENTRO", "LOCAL"];

function renumber(steps: ManeuverStep[]): ManeuverStep[] {
  return steps.map((step, index) => ({ ...step, order: index + 1 }));
}

interface SortableStepRowProps {
  step: ManeuverStep;
  index: number;
  disabled: boolean;
  onChangeDescription: (stepId: string, description: string) => void;
  onChangeResponsibility: (stepId: string, responsibility: ManeuverStepResponsibility) => void;
  onDelete: (stepId: string) => void;
}

function SortableStepRow({
  step,
  index,
  disabled,
  onChangeDescription,
  onChangeResponsibility,
  onDelete,
}: SortableStepRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 border-b border-slate-100 bg-white px-3 py-2 text-sm text-slate-700"
    >
      {!disabled && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-1 shrink-0 cursor-grab touch-none text-slate-300 hover:text-slate-500 active:cursor-grabbing"
          aria-label="Arrastar para reordenar"
        >
          ⠿
        </button>
      )}
      <span className="mt-1 shrink-0 text-xs font-semibold text-slate-400">{index + 1}.</span>
      <div className="flex-1">
        <textarea
          value={step.description}
          disabled={disabled}
          onChange={(e) => onChangeDescription(step.id, e.target.value)}
          rows={2}
          className="w-full resize-none rounded border border-slate-200 bg-transparent px-1.5 py-1 text-sm focus:border-blue-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
        />
        <div className="mt-1 flex items-center gap-2">
          <StepBadges step={step} />
          <select
            value={step.responsibility}
            disabled={disabled}
            onChange={(e) => onChangeResponsibility(step.id, e.target.value as ManeuverStepResponsibility)}
            className="rounded border border-slate-200 px-1 py-0.5 text-[10px] disabled:bg-slate-50 disabled:text-slate-400"
          >
            {RESPONSIBILITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {!disabled && (
            <button
              type="button"
              onClick={() => onDelete(step.id)}
              className="ml-auto text-[10px] text-red-400 hover:text-red-600"
            >
              excluir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InsertStepButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  if (disabled) return null;
  return (
    <div className="flex justify-center border-b border-slate-100 bg-slate-50/50 py-0.5">
      <button type="button" onClick={onClick} className="px-2 py-0.5 text-[11px] text-slate-400 hover:text-slate-700">
        ＋ Inserir passo
      </button>
    </div>
  );
}

export function ManeuverEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: maneuver, isLoading } = useQuery({
    queryKey: ["maneuvers", id],
    queryFn: () => maneuversService.get(id!),
    enabled: !!id,
  });

  const [number, setNumber] = useState<string | null>(null);
  const [header, setHeader] = useState<ManeuverHeader>({
    data: null,
    responsavel: null,
    area: null,
    substations: [],
    descricao_isolamento: null,
  });
  const [steps, setSteps] = useState<ManeuverStep[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const loadedRef = useRef(false);
  useEffect(() => {
    if (!maneuver || loadedRef.current) return;
    loadedRef.current = true;
    setNumber(maneuver.number);
    setHeader(maneuver.header);
    setSteps(maneuver.steps);
  }, [maneuver]);

  const saveTimeoutRef = useRef<number | null>(null);

  async function flushSave() {
    if (!id) return;
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    setSaveStatus("saving");
    try {
      const updated = await maneuversService.updateHeader(id, header);
      setNumber(updated.number);
      await Promise.all(
        steps.map((step) =>
          maneuversService.updateStep(id, step.id, {
            description: step.description,
            responsibility: step.responsibility,
          })
        )
      );
      setDirty(false);
      setSaveStatus("saved");
      queryClient.invalidateQueries({ queryKey: ["maneuvers", id] });
    } catch {
      setSaveStatus("error");
      setError("Não foi possível salvar a manobra.");
    }
  }

  function scheduleSave() {
    setDirty(true);
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
      flushSave();
    }, AUTO_SAVE_DELAY_MS);
  }

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const readOnly = maneuver?.status === "FINALIZADA";

  function handleHeaderChange(patch: Partial<ManeuverHeader>) {
    setHeader((prev) => ({ ...prev, ...patch }));
    scheduleSave();
  }

  function handleStepDescriptionChange(stepId: string, description: string) {
    setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, description } : s)));
    scheduleSave();
  }

  function handleStepResponsibilityChange(stepId: string, responsibility: ManeuverStepResponsibility) {
    setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, responsibility } : s)));
    scheduleSave();
  }

  async function handleDeleteStep(stepId: string) {
    if (!id) return;
    if (!window.confirm("Excluir este passo da manobra?")) return;
    const next = renumber(steps.filter((s) => s.id !== stepId));
    setSteps(next);
    try {
      await maneuversService.deleteStep(id, stepId);
    } catch {
      setError("Não foi possível excluir o passo.");
    }
  }

  async function handleInsertStep(index: number) {
    if (!id) return;
    try {
      const created = await maneuversService.addStep(id, {
        description: "",
        action: null,
        origin: "MANUAL",
        responsibility: "CENTRO",
      });
      const next = [...steps];
      next.splice(index, 0, created);
      const renumbered = renumber(next);
      setSteps(renumbered);
      await maneuversService.reorderSteps(
        id,
        renumbered.map((s) => s.id)
      );
    } catch {
      setError("Não foi possível inserir o passo.");
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    if (!id) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = renumber(arrayMove(steps, oldIndex, newIndex));
    setSteps(next);
    try {
      await maneuversService.reorderSteps(
        id,
        next.map((s) => s.id)
      );
    } catch {
      setError("Não foi possível salvar a nova ordem dos passos.");
    }
  }

  async function handleSave() {
    await flushSave();
  }

  async function handleViewPdf() {
    await flushSave();
    window.open(`/manobras/${id}/pdf`, "_blank", "noreferrer");
  }

  function handleBack() {
    if (dirty && !window.confirm("Há alterações não salvas. Sair mesmo assim?")) return;
    navigate(`/manobras/${id}`);
  }

  if (isLoading) return <p className="p-8 text-slate-500">Carregando...</p>;
  if (!maneuver) return <p className="p-8 text-slate-500">Manobra não encontrada.</p>;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
        <div>
          <Link to={`/manobras/${id}`} className="text-sm text-slate-500 hover:text-slate-700">
            ← Voltar
          </Link>
          <h1 className="mt-1 text-sm font-semibold text-slate-900">Editar manobra — {maneuver.title}</h1>
        </div>
        {saveStatus === "saving" && <span className="text-xs text-slate-400">Salvando...</span>}
        {saveStatus === "saved" && <span className="text-xs text-emerald-600">Salvo</span>}
        {saveStatus === "error" && <span className="text-xs text-red-600">Erro ao salvar</span>}
      </header>

      {readOnly && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Manobra finalizada — somente leitura.
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
          <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            ✕
          </button>
        </div>
      )}

      <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-6 pb-24">
        <div className="mb-4 grid grid-cols-2 gap-3 rounded-md border border-slate-200 p-4 sm:grid-cols-4">
          <label className="text-xs text-slate-600">
            Número
            <input
              type="text"
              value={number ?? "—"}
              disabled
              className="mt-0.5 w-full rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-sm text-slate-400"
            />
          </label>
          <label className="text-xs text-slate-600">
            Data
            <input
              type="date"
              value={header.data ?? ""}
              disabled={readOnly}
              onChange={(e) => handleHeaderChange({ data: e.target.value || null })}
              className="mt-0.5 w-full rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50 disabled:text-slate-400"
            />
          </label>
          <label className="text-xs text-slate-600">
            Responsável
            <input
              type="text"
              value={header.responsavel ?? ""}
              disabled={readOnly}
              onChange={(e) => handleHeaderChange({ responsavel: e.target.value || null })}
              className="mt-0.5 w-full rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50 disabled:text-slate-400"
            />
          </label>
          <label className="text-xs text-slate-600">
            Área
            <input
              type="text"
              value={header.area ?? ""}
              disabled={readOnly}
              onChange={(e) => handleHeaderChange({ area: e.target.value || null })}
              className="mt-0.5 w-full rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50 disabled:text-slate-400"
            />
          </label>
          <label className="col-span-2 text-xs text-slate-600 sm:col-span-4">
            Subestações
            <input
              type="text"
              value={maneuver.substation_names.join(", ") || "—"}
              disabled
              className="mt-0.5 w-full rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-sm text-slate-400"
            />
          </label>
          <label className="col-span-2 text-xs text-slate-600 sm:col-span-4">
            Descrição do isolamento
            <textarea
              value={header.descricao_isolamento ?? ""}
              disabled={readOnly}
              onChange={(e) => handleHeaderChange({ descricao_isolamento: e.target.value || null })}
              rows={3}
              className="mt-0.5 w-full resize-none rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50 disabled:text-slate-400"
            />
          </label>
        </div>

        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Passos da manobra</h2>
        <div className="rounded-md border border-slate-200">
          <InsertStepButton disabled={readOnly} onClick={() => handleInsertStep(0)} />
          {steps.length === 0 ? (
            <p className="p-3 text-sm text-slate-400">Nenhum passo ainda.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div>
                  {steps.map((step, index) => (
                    <div key={step.id}>
                      <SortableStepRow
                        step={step}
                        index={index}
                        disabled={readOnly}
                        onChangeDescription={handleStepDescriptionChange}
                        onChangeResponsibility={handleStepResponsibilityChange}
                        onDelete={handleDeleteStep}
                      />
                      <InsertStepButton disabled={readOnly} onClick={() => handleInsertStep(index + 1)} />
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={handleBack}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={handleViewPdf}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          Visualizar PDF
        </button>
        {!readOnly && (
          <button
            type="button"
            onClick={handleSave}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Salvar
          </button>
        )}
      </footer>
    </div>
  );
}
