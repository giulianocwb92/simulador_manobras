import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ReactFlowProvider, type Edge } from "@xyflow/react";
import { ApiError } from "../services/api";
import { substationsService } from "../services/substations";
import { useEditorStore } from "../stores/editorStore";
import { useManeuverStore } from "../stores/maneuverStore";
import { useUserStore } from "../stores/userStore";
import { useAutoSave } from "../hooks/useAutoSave";
import { useEditorShortcuts } from "../hooks/useEditorShortcuts";
import { Canvas } from "./editor/Canvas";
import { Toolbar } from "./editor/Toolbar";
import { LockBanner } from "./editor/LockBanner";
import { PropertiesModal, type PropertiesModalSubmitPayload } from "./editor/PropertiesModal";
import { StepsPanel } from "./maneuver/StepsPanel";
import { ManeuverHeaderForm } from "./maneuver/ManeuverHeaderForm";
import { generateStepDescription, TOGGLEABLE_KINDS } from "../utils/maneuverStepText";
import { maneuversService } from "../services/maneuvers";
import type { EquipmentKind, EquipmentState, TopologyNode } from "../types/topology";
import type { ManeuverAction } from "../types/maneuver";
import type { Substation, Topology } from "../types/substation";

function topologyToStore(topology: Topology): { nodes: TopologyNode[]; edges: Edge[] } {
  // dados legados sem position/data (ex: escritos manualmente antes desta versão) são ignorados
  const nodes = topology.nodes.filter(
    (n) => n.position && typeof n.position.x === "number" && n.data !== undefined
  ) as unknown as TopologyNode[];
  const edges: Edge[] = topology.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
  }));
  return { nodes, edges };
}

function storeToTopology(nodes: TopologyNode[], edges: Edge[]): Topology {
  return {
    nodes: nodes.map((n) => ({ id: n.id, type: n.type ?? "", position: n.position, data: n.data })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
    })),
  };
}

type ModalState =
  | { mode: "create"; kind: EquipmentKind; position: { x: number; y: number } }
  | { mode: "edit"; nodeId: string; kind: EquipmentKind; data: Record<string, unknown> }
  | null;

export function SubstationEditorPage() {
  const { id } = useParams<{ id: string }>();
  const currentUser = useUserStore((s) => s.currentUser);
  const queryClient = useQueryClient();

  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const mode = useEditorStore((s) => s.mode);
  const setMode = useEditorStore((s) => s.setMode);
  const setTopology = useEditorStore((s) => s.setTopology);
  const addNode = useEditorStore((s) => s.addNode);
  const updateNodeData = useEditorStore((s) => s.updateNodeData);
  const reset = useEditorStore((s) => s.reset);
  const secondarySubstation = useEditorStore((s) => s.secondarySubstation);
  const secondaryIds = useEditorStore((s) => s.secondaryIds);
  const loadSecondarySubstation = useEditorStore((s) => s.loadSecondarySubstation);
  const unloadSecondarySubstation = useEditorStore((s) => s.unloadSecondarySubstation);
  const addManeuverStep = useManeuverStore((s) => s.addStep);
  const resetManeuver = useManeuverStore((s) => s.reset);
  const maneuverId = useManeuverStore((s) => s.maneuverId);
  const setManeuverId = useManeuverStore((s) => s.setManeuverId);
  const maneuverStatus = useManeuverStore((s) => s.status);
  const setManeuverStatus = useManeuverStore((s) => s.setStatus);

  const [ownsLock, setOwnsLock] = useState(false);
  const [lockedByName, setLockedByName] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [secondarySubstationId, setSecondarySubstationId] = useState<string | null>(null);

  const { data: substation } = useQuery({
    queryKey: ["substations", id],
    queryFn: () => substationsService.get(id!),
    enabled: !!id,
  });

  const { data: allSubstations } = useQuery({
    queryKey: ["substations"],
    queryFn: substationsService.list,
  });

  // SE adicional carregada no mesmo canvas (view + toggle de estado durante a
  // gravação) — ver docs/implementation-plan.md FASE 6, "suporte a múltiplas SEs".
  // Só uma leitura (GET), sem lock: essa SE não é editada nem salva por aqui.
  const { data: secondaryData } = useQuery({
    queryKey: ["substations", secondarySubstationId],
    queryFn: () => substationsService.get(secondarySubstationId!),
    enabled: !!secondarySubstationId,
  });

  useEffect(() => {
    if (!substation) return;
    const { nodes: loadedNodes, edges: loadedEdges } = topologyToStore(substation.topology);
    setTopology(loadedNodes, loadedEdges);
  }, [substation, setTopology]);

  useEffect(() => {
    if (!secondaryData) return;
    const { nodes: loadedNodes, edges: loadedEdges } = topologyToStore(secondaryData.topology);
    loadSecondarySubstation(
      { id: secondaryData.id, name: secondaryData.name, sigla: secondaryData.sigla },
      loadedNodes,
      loadedEdges
    );
  }, [secondaryData, loadSecondarySubstation]);

  function handleSecondarySubstationChange(newId: string) {
    if (!newId) {
      unloadSecondarySubstation();
      setSecondarySubstationId(null);
      return;
    }
    setSecondarySubstationId(newId);
  }

  useEffect(() => {
    if (!id || !currentUser) return;

    substationsService
      .lock(id, currentUser.id)
      .then(() => setOwnsLock(true))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 423) {
          const body = err.body as { locked_by_name?: string } | null;
          setLockedByName(body?.locked_by_name ?? "outro usuário");
        }
      });

    return () => {
      substationsService.releaseLockBeacon(id, currentUser.id);
      reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, currentUser?.id]);

  useEffect(() => {
    function handleBeforeUnload() {
      if (id && currentUser && ownsLock) {
        substationsService.releaseLockBeacon(id, currentUser.id);
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [id, currentUser, ownsLock]);

  useEditorShortcuts(ownsLock && mode === "CONFIGURACAO");

  async function save() {
    if (!id || !currentUser) return;
    setSaveStatus("saving");
    try {
      // Nós/arestas da SE secundária (ver secondaryIds) não pertencem a essa SE —
      // ficam de fora do PUT pra não gravar o diagrama de outra subestação aqui.
      const ownNodes = nodes.filter((n) => !secondaryIds.has(n.id));
      const ownEdges = edges.filter((e) => !secondaryIds.has(e.id));
      const updated = await substationsService.updateTopology(id, currentUser.id, storeToTopology(ownNodes, ownEdges));
      queryClient.setQueryData<Substation>(["substations", id], updated);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }

  useAutoSave(save, 30000, ownsLock);

  function handleDropEquipment(kind: EquipmentKind, position: { x: number; y: number }) {
    setModalState({ mode: "create", kind, position });
  }

  function handleNodeDoubleClick(nodeId: string) {
    if (!ownsLock) return;
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || !node.type) return;
    setModalState({ mode: "edit", nodeId, kind: node.type as EquipmentKind, data: node.data });
  }

  function handleModalSubmit(payload: PropertiesModalSubmitPayload) {
    if (!modalState) return;
    if (modalState.mode === "create") {
      const newId = `${modalState.kind}-${crypto.randomUUID()}`;
      addNode({
        id: newId,
        type: modalState.kind,
        position: modalState.position,
        data: payload.data,
      } as TopologyNode);
    } else {
      updateNodeData(modalState.nodeId, payload.data);
    }
    setModalState(null);
  }

  // Modo GRAVANDO (ver docs/editor-topology.md): clique num DJ/CH/Religador
  // alterna o estado e gera automaticamente um passo na manobra, persistido
  // na hora (mesmo espírito do auto-save da topologia — não perder passos se
  // a aba fechar no meio da gravação).
  async function handleEquipmentToggle(nodeId: string) {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || !TOGGLEABLE_KINDS.has(node.type as EquipmentKind)) return;
    const data = node.data as { estado?: EquipmentState; label?: string };
    if (!data.estado || !data.label) return;
    const novoEstado: EquipmentState = data.estado === "aberto" ? "fechado" : "aberto";
    const acao: ManeuverAction = novoEstado === "aberto" ? "ABRIR" : "FECHAR";
    updateNodeData(nodeId, { estado: novoEstado });
    // Com 2 SEs carregadas, prefixa cada passo com a sigla de onde o equipamento
    // está de fato — sem isso "Abrir DJ 52-01" fica ambíguo entre as duas SEs.
    const siglaSe = secondarySubstation
      ? secondaryIds.has(nodeId)
        ? secondarySubstation.sigla
        : substation?.sigla
      : undefined;
    const description = generateStepDescription(node.type as EquipmentKind, data.label, acao, siglaSe);
    if (!description) return;

    const payload = { description, equipment_id: nodeId, action: acao, origin: "SIMULADOR" as const };
    const currentManeuverId = useManeuverStore.getState().maneuverId;
    if (currentManeuverId) {
      try {
        const persisted = await maneuversService.addStep(currentManeuverId, payload);
        addManeuverStep(persisted);
        return;
      } catch {
        setConnectError("Não foi possível salvar o passo — seguindo só localmente.");
      }
    }
    const currentSteps = useManeuverStore.getState().steps;
    addManeuverStep({ id: crypto.randomUUID(), order: currentSteps.length + 1, ...payload });
  }

  async function handleStartRecording() {
    resetManeuver();
    setMode("GRAVANDO");
    if (!id || !substation) return;
    const substationIds = [id, ...(secondarySubstation ? [secondarySubstation.id] : [])];
    try {
      const created = await maneuversService.create({
        title: `Manobra ${substation.name}`,
        created_by: currentUser?.id ?? null,
        substation_ids: substationIds,
      });
      setManeuverId(created.id);
      setManeuverStatus(created.status);
    } catch {
      setConnectError("Não foi possível criar o registro da manobra — os passos ficarão só locais, sem salvar.");
    }
  }

  function handleFinishRecording() {
    setMode("FINALIZADA");
  }

  async function handleFinalizeManeuver() {
    if (!maneuverId) return;
    try {
      const finalized = await maneuversService.finalize(maneuverId);
      setManeuverStatus(finalized.status);
    } catch {
      setConnectError("Não foi possível finalizar a manobra.");
    }
  }

  const substationOptions = (allSubstations ?? []).filter((s) => s.id !== id).map((s) => ({ id: s.id, name: s.name }));

  if (!substation) {
    return <p className="p-8 text-slate-500">Carregando subestação...</p>;
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
            ← Subestações
          </Link>
          <h1 className="text-sm font-semibold text-slate-900">
            {substation.name} <span className="font-normal text-slate-400">({substation.sigla})</span>
          </h1>
        </div>
        {ownsLock && (
          <div className="flex items-center gap-3">
            {mode !== "FINALIZADA" && (
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                2ª SE (opcional)
                <select
                  value={secondarySubstationId ?? ""}
                  onChange={(e) => handleSecondarySubstationChange(e.target.value)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs"
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
            {mode === "CONFIGURACAO" && (
              <>
                {saveStatus === "saving" && <span className="text-xs text-slate-400">Salvando...</span>}
                {saveStatus === "saved" && <span className="text-xs text-emerald-600">Salvo</span>}
                {saveStatus === "error" && <span className="text-xs text-red-600">Erro ao salvar</span>}
                <button
                  type="button"
                  onClick={save}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                >
                  Salvar subestação
                </button>
                <button
                  type="button"
                  onClick={handleStartRecording}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  Iniciar Gravação
                </button>
              </>
            )}
            {mode === "GRAVANDO" && (
              <>
                <span className="flex items-center gap-1.5 text-xs font-medium text-red-600">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" /> Gravando manobra
                </span>
                <button
                  type="button"
                  onClick={handleFinishRecording}
                  className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900"
                >
                  Finalizar Gravação
                </button>
              </>
            )}
            {mode === "FINALIZADA" &&
              (maneuverStatus === "FINALIZADA" ? (
                <span className="text-xs font-medium text-slate-500">Manobra finalizada</span>
              ) : (
                <>
                  <span className="text-xs font-medium text-slate-500">Editando manobra</span>
                  <button
                    type="button"
                    onClick={handleFinalizeManeuver}
                    className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
                  >
                    Finalizar Manobra
                  </button>
                </>
              ))}
          </div>
        )}
      </header>

      {lockedByName && !ownsLock && <LockBanner lockedByName={lockedByName} />}

      {secondarySubstation && (
        <div className="flex items-center justify-between border-b border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-800">
          2ª SE carregada no canvas (à direita, separada visualmente): <strong>{secondarySubstation.name}</strong>{" "}
          ({secondarySubstation.sigla}) — visualização apenas, não é salva por esta tela.
          <button
            type="button"
            onClick={() => handleSecondarySubstationChange("")}
            className="text-blue-500 hover:text-blue-700"
          >
            remover
          </button>
        </div>
      )}

      {connectError && (
        <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {connectError}
          <button type="button" onClick={() => setConnectError(null)} className="text-red-400 hover:text-red-600">
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {ownsLock && mode === "CONFIGURACAO" && <Toolbar />}
        <div className="flex-1">
          <ReactFlowProvider>
            <Canvas
              readOnly={!ownsLock || mode === "FINALIZADA"}
              recording={ownsLock && mode === "GRAVANDO"}
              onNodeDoubleClick={handleNodeDoubleClick}
              onEquipmentToggle={handleEquipmentToggle}
              onConnectError={setConnectError}
              onDropEquipment={handleDropEquipment}
            />
          </ReactFlowProvider>
        </div>
        {(mode === "GRAVANDO" || mode === "FINALIZADA") && (
          <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white">
            {mode === "FINALIZADA" && <ManeuverHeaderForm readOnly={maneuverStatus === "FINALIZADA"} />}
            <StepsPanel readOnly={mode === "GRAVANDO" || maneuverStatus === "FINALIZADA"} />
          </aside>
        )}
      </div>

      {modalState && (
        <PropertiesModal
          kind={modalState.kind}
          initialData={modalState.mode === "edit" ? modalState.data : undefined}
          substationOptions={substationOptions}
          onSubmit={handleModalSubmit}
          onCancel={() => setModalState(null)}
        />
      )}
    </div>
  );
}
