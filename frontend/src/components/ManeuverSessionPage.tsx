import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ReactFlowProvider } from "@xyflow/react";
import { substationsService } from "../services/substations";
import { maneuversService } from "../services/maneuvers";
import { useSessionStore } from "../stores/sessionStore";
import { useManeuverStore } from "../stores/maneuverStore";
import { useUserStore } from "../stores/userStore";
import { useEditorShortcuts } from "../hooks/useEditorShortcuts";
import { Canvas } from "./editor/Canvas";
import { Toolbar } from "./editor/Toolbar";
import { PropertiesModal, type PropertiesModalSubmitPayload } from "./editor/PropertiesModal";
import { StepsPanel } from "./maneuver/StepsPanel";
import { topologyToStore } from "../utils/topologySerialization";
import { generateStepDescription, TOGGLEABLE_KINDS } from "../utils/maneuverStepText";
import type { EquipmentKind, EquipmentState, TopologyNode } from "../types/topology";
import type { ManeuverAction } from "../types/maneuver";

const SESSION_TOOLBAR_KINDS: ReadonlySet<EquipmentKind> = new Set(["jumper", "chave_provisoria"]);

type ModalState =
  | { mode: "create"; kind: EquipmentKind; position: { x: number; y: number } }
  | { mode: "edit"; nodeId: string; kind: EquipmentKind; data: Record<string, unknown> }
  | null;

/** Fase 1 (seleção de SEs) + fase 2 (canvas de sessão) da FRENTE 2 —
 *  ver docs/refatorar_manobras.md. A topologia das SEs importadas nunca é
 *  persistida: `PUT /substations/:id` não é chamado em nenhum momento aqui. */
export function ManeuverSessionPage() {
  const currentUser = useUserStore((s) => s.currentUser);

  const mode = useSessionStore((s) => s.mode);
  const setMode = useSessionStore((s) => s.setMode);
  const substations = useSessionStore((s) => s.substations);
  const baseIds = useSessionStore((s) => s.baseIds);
  const nodeSubstationSigla = useSessionStore((s) => s.nodeSubstationSigla);
  const nodes = useSessionStore((s) => s.nodes);
  const edges = useSessionStore((s) => s.edges);
  const onNodesChange = useSessionStore((s) => s.onNodesChange);
  const onEdgesChange = useSessionStore((s) => s.onEdgesChange);
  const addEdge = useSessionStore((s) => s.addEdge);
  const removeEdge = useSessionStore((s) => s.removeEdge);
  const rotateSelectedNodes = useSessionStore((s) => s.rotateSelectedNodes);
  const wireMode = useSessionStore((s) => s.wireMode);
  const setWireMode = useSessionStore((s) => s.setWireMode);
  const wirePending = useSessionStore((s) => s.wirePending);
  const startWire = useSessionStore((s) => s.startWire);
  const cancelWire = useSessionStore((s) => s.cancelWire);
  const addBarHandle = useSessionStore((s) => s.addBarHandle);
  const loadSubstation = useSessionStore((s) => s.loadSubstation);
  const addNode = useSessionStore((s) => s.addNode);
  const updateNodeData = useSessionStore((s) => s.updateNodeData);
  const sessionReset = useSessionStore((s) => s.reset);

  const addManeuverStep = useManeuverStore((s) => s.addStep);
  const setManeuverSteps = useManeuverStore((s) => s.setSteps);
  const resetManeuver = useManeuverStore((s) => s.reset);
  const maneuverId = useManeuverStore((s) => s.maneuverId);
  const setManeuverId = useManeuverStore((s) => s.setManeuverId);
  const maneuverStatus = useManeuverStore((s) => s.status);
  const setManeuverStatus = useManeuverStore((s) => s.setStatus);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [showBackToRecording, setShowBackToRecording] = useState(false);
  const [backToRecordingBusy, setBackToRecordingBusy] = useState(false);

  const { data: allSubstations, isLoading } = useQuery({
    queryKey: ["substations"],
    queryFn: substationsService.list,
  });

  useEffect(() => {
    return () => {
      sessionReset();
      resetManeuver();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEditorShortcuts(mode === "MONTAGEM", { rotateSelectedNodes, wireMode, setWireMode });

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleStartSession() {
    setStarting(true);
    setError(null);
    try {
      for (const id of selectedIds) {
        const substation = await substationsService.get(id);
        const { nodes: loadedNodes, edges: loadedEdges } = topologyToStore(substation.topology);
        loadSubstation({ id: substation.id, name: substation.name, sigla: substation.sigla }, loadedNodes, loadedEdges);
      }
      setStarted(true);
    } catch {
      setError("Não foi possível carregar uma das subestações selecionadas.");
    } finally {
      setStarting(false);
    }
  }

  function handleDropEquipment(kind: EquipmentKind, position: { x: number; y: number }) {
    setModalState({ mode: "create", kind, position });
  }

  function handleNodeDoubleClick(nodeId: string) {
    if (mode !== "MONTAGEM" || baseIds.has(nodeId)) return;
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

  async function handleEquipmentToggle(nodeId: string) {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || !TOGGLEABLE_KINDS.has(node.type as EquipmentKind)) return;
    const data = node.data as { estado?: EquipmentState; label?: string };
    if (!data.estado || !data.label) return;
    const novoEstado: EquipmentState = data.estado === "aberto" ? "fechado" : "aberto";
    const acao: ManeuverAction = novoEstado === "aberto" ? "ABRIR" : "FECHAR";
    updateNodeData(nodeId, { estado: novoEstado });
    // Com 2+ SEs na sessão, prefixa cada passo com a sigla de onde o equipamento
    // está de fato — sem isso "Abrir DJ 52-01" fica ambíguo entre as SEs.
    const siglaSe = substations.length > 1 ? nodeSubstationSigla.get(nodeId) : undefined;
    const description = generateStepDescription(node.type as EquipmentKind, data.label, acao, siglaSe);
    if (!description) return;

    const payload = { description, equipment_id: nodeId, action: acao };
    const currentManeuverId = useManeuverStore.getState().maneuverId;
    if (currentManeuverId) {
      try {
        const persisted = await maneuversService.addStep(currentManeuverId, payload);
        addManeuverStep(persisted);
        return;
      } catch {
        setError("Não foi possível salvar o passo — seguindo só localmente.");
      }
    }
    const currentSteps = useManeuverStore.getState().steps;
    addManeuverStep({ id: crypto.randomUUID(), order: currentSteps.length + 1, responsibility: "CENTRO", ...payload });
  }

  async function handleStartRecording() {
    resetManeuver();
    setMode("GRAVANDO");
    const title =
      substations.length === 1
        ? `Manobra ${substations[0].name}`
        : `Manobra ${substations.map((s) => s.sigla).join(" + ")}`;
    try {
      const created = await maneuversService.create({
        title,
        created_by: currentUser?.id ?? null,
        substation_ids: substations.map((s) => s.id),
      });
      setManeuverId(created.id);
      setManeuverStatus(created.status);
    } catch {
      setError("Não foi possível criar o registro da manobra — os passos ficarão só locais, sem salvar.");
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
      setError("Não foi possível finalizar a manobra.");
    }
  }

  // "Voltar à Gravação" (ver docs/refatorar_manobras.md, FRENTE 4c): reabre a
  // manobra (se já FINALIZADA no backend) e limpa os passos existentes — não
  // há versionamento de manobra, então "sobrepor" reaproveita o mesmo
  // maneuver_id em vez de criar um novo registro.
  async function clearManeuverSteps() {
    if (!maneuverId) {
      setManeuverSteps([]);
      return;
    }
    if (maneuverStatus === "FINALIZADA") {
      const reopened = await maneuversService.reopen(maneuverId);
      setManeuverStatus(reopened.status);
    }
    const currentSteps = useManeuverStore.getState().steps;
    await Promise.all(currentSteps.map((step) => maneuversService.deleteStep(maneuverId, step.id)));
    setManeuverSteps([]);
  }

  async function handleReiniciarTopologia() {
    setBackToRecordingBusy(true);
    setError(null);
    try {
      await clearManeuverSteps();
      const toReimport = substations;
      sessionReset();
      for (const s of toReimport) {
        const substation = await substationsService.get(s.id);
        const { nodes: loadedNodes, edges: loadedEdges } = topologyToStore(substation.topology);
        loadSubstation({ id: substation.id, name: substation.name, sigla: substation.sigla }, loadedNodes, loadedEdges);
      }
      setMode("MONTAGEM");
      setShowBackToRecording(false);
    } catch {
      setError("Não foi possível reiniciar a topologia da sessão.");
    } finally {
      setBackToRecordingBusy(false);
    }
  }

  async function handleSobreporGravacao() {
    setBackToRecordingBusy(true);
    setError(null);
    try {
      await clearManeuverSteps();
      setMode("GRAVANDO");
      setShowBackToRecording(false);
    } catch {
      setError("Não foi possível iniciar uma nova gravação.");
    } finally {
      setBackToRecordingBusy(false);
    }
  }

  if (!started) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <Link to="/manobras" className="text-sm text-slate-500 hover:text-slate-700">
          ← Manobras
        </Link>
        <h1 className="mt-1 mb-1 text-2xl font-semibold text-slate-900">Nova sessão de manobra</h1>
        <p className="mb-6 text-sm text-slate-500">
          Selecione uma ou mais subestações. A topologia delas é importada só-leitura pra esta sessão — nada aqui é
          salvo de volta no cadastro da SE.
        </p>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {isLoading && <p className="text-slate-500">Carregando subestações...</p>}

        <ul className="mb-6 divide-y divide-slate-200 rounded-md border border-slate-200">
          {allSubstations?.map((s) => (
            <li key={s.id}>
              <label className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={selectedIds.has(s.id)}
                  onChange={() => toggleSelected(s.id)}
                  className="h-4 w-4"
                />
                <div>
                  <p className="font-medium text-slate-900">{s.name}</p>
                  <p className="text-sm text-slate-500">{s.sigla}</p>
                </div>
              </label>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={handleStartSession}
          disabled={selectedIds.size === 0 || starting}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {starting ? "Carregando..." : "Iniciar sessão"}
        </button>
      </div>
    );
  }

  const topology = {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    addEdge,
    removeEdge,
    rotateSelectedNodes,
    wireMode,
    setWireMode,
    wirePending,
    startWire,
    cancelWire,
    addBarHandle,
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
        <div className="flex items-center gap-3">
          <Link to="/manobras" className="text-sm text-slate-500 hover:text-slate-700">
            ← Manobras
          </Link>
          <h1 className="text-sm font-semibold text-slate-900">
            Sessão de manobra —{" "}
            <span className="font-normal text-slate-400">{substations.map((s) => s.sigla).join(" + ")}</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {mode === "MONTAGEM" && (
            <button
              type="button"
              onClick={handleStartRecording}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
            >
              Iniciar Gravação
            </button>
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
          {mode === "FINALIZADA" && (
            <>
              {maneuverStatus === "FINALIZADA" ? (
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
              )}
              <button
                type="button"
                onClick={() => setShowBackToRecording(true)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Voltar à Gravação
              </button>
            </>
          )}
        </div>
      </header>

      {error && (
        <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
          <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {mode === "MONTAGEM" && (
          <Toolbar
            nodes={nodes}
            rotateSelectedNodes={rotateSelectedNodes}
            wireMode={wireMode}
            setWireMode={setWireMode}
            allowedKinds={SESSION_TOOLBAR_KINDS}
          />
        )}
        <div className="flex-1">
          <ReactFlowProvider>
            <Canvas
              topology={topology}
              readOnly={mode === "FINALIZADA"}
              recording={mode === "GRAVANDO"}
              onNodeDoubleClick={handleNodeDoubleClick}
              onEquipmentToggle={handleEquipmentToggle}
              onConnectError={setError}
              onDropEquipment={handleDropEquipment}
            />
          </ReactFlowProvider>
        </div>
        {(mode === "GRAVANDO" || mode === "FINALIZADA") && (
          <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white">
            <StepsPanel readOnly={mode === "GRAVANDO" || maneuverStatus === "FINALIZADA"} />
          </aside>
        )}
      </div>

      {modalState && (
        <PropertiesModal
          kind={modalState.kind}
          initialData={modalState.mode === "edit" ? modalState.data : undefined}
          onSubmit={handleModalSubmit}
          onCancel={() => setModalState(null)}
        />
      )}

      {showBackToRecording && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-96 rounded-lg bg-white p-5 shadow-lg">
            <h2 className="mb-1 text-sm font-semibold text-slate-900">Voltar à gravação</h2>
            <p className="mb-4 text-sm text-slate-500">Como você quer continuar?</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={backToRecordingBusy}
                onClick={handleReiniciarTopologia}
                className="rounded-md border border-slate-300 px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                <span className="block font-medium text-slate-900">Reiniciar topologia</span>
                <span className="block text-xs text-slate-500">
                  Limpa o canvas e reimporta as SEs do banco do zero. Os passos também são apagados.
                </span>
              </button>
              <button
                type="button"
                disabled={backToRecordingBusy}
                onClick={handleSobreporGravacao}
                className="rounded-md border border-slate-300 px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                <span className="block font-medium text-slate-900">Nova gravação (sobrepor)</span>
                <span className="block text-xs text-slate-500">
                  Mantém o canvas atual (provisórios, wires, layout). Limpa só os passos e já inicia a gravação.
                </span>
              </button>
              <button
                type="button"
                disabled={backToRecordingBusy}
                onClick={() => setShowBackToRecording(false)}
                className="rounded-md px-3 py-2 text-center text-sm text-slate-500 hover:bg-slate-100"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
