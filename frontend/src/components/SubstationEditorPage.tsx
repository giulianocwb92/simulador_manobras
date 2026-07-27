import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ReactFlowProvider } from "@xyflow/react";
import { ApiError } from "../services/api";
import { substationsService } from "../services/substations";
import { useEditorStore } from "../stores/editorStore";
import { useUserStore } from "../stores/userStore";
import { useAutoSave } from "../hooks/useAutoSave";
import { useEditorShortcuts } from "../hooks/useEditorShortcuts";
import { Canvas } from "./editor/Canvas";
import { Toolbar } from "./editor/Toolbar";
import { LockBanner } from "./editor/LockBanner";
import { PropertiesModal, type PropertiesModalSubmitPayload } from "./editor/PropertiesModal";
import { topologyToStore, storeToTopology } from "../utils/topologySerialization";
import type { EquipmentKind, TopologyNode } from "../types/topology";
import type { Substation } from "../types/substation";

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
  const onNodesChange = useEditorStore((s) => s.onNodesChange);
  const onEdgesChange = useEditorStore((s) => s.onEdgesChange);
  const addEdge = useEditorStore((s) => s.addEdge);
  const removeEdge = useEditorStore((s) => s.removeEdge);
  const rotateSelectedNodes = useEditorStore((s) => s.rotateSelectedNodes);
  const wireMode = useEditorStore((s) => s.wireMode);
  const setWireMode = useEditorStore((s) => s.setWireMode);
  const wirePending = useEditorStore((s) => s.wirePending);
  const startWire = useEditorStore((s) => s.startWire);
  const cancelWire = useEditorStore((s) => s.cancelWire);
  const addBarHandle = useEditorStore((s) => s.addBarHandle);
  const setTopology = useEditorStore((s) => s.setTopology);
  const addNode = useEditorStore((s) => s.addNode);
  const updateNodeData = useEditorStore((s) => s.updateNodeData);
  const reset = useEditorStore((s) => s.reset);

  const [ownsLock, setOwnsLock] = useState(false);
  const [lockedByName, setLockedByName] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const { data: substation } = useQuery({
    queryKey: ["substations", id],
    queryFn: () => substationsService.get(id!),
    enabled: !!id,
  });

  // Calculado uma única vez, na primeira vez que a SE chega — não pode vir de
  // `nodes` da store (que ainda está vazia nesse exato momento, populada só
  // depois via `setTopology` no efeito abaixo) nem ser recalculado depois
  // (autosave/troca de query cache não deve ligar/desligar isso). Ver
  // Canvas.tsx `fitView` pra motivo completo.
  const hasInitialNodesRef = useRef<boolean | null>(null);
  if (substation && hasInitialNodesRef.current === null) {
    hasInitialNodesRef.current = substation.topology.nodes.length > 0;
  }

  const { data: allSubstations } = useQuery({
    queryKey: ["substations"],
    queryFn: substationsService.list,
  });

  useEffect(() => {
    if (!substation) return;
    const { nodes: loadedNodes, edges: loadedEdges } = topologyToStore(substation.topology);
    setTopology(loadedNodes, loadedEdges);
  }, [substation, setTopology]);

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

  useEditorShortcuts(ownsLock, { rotateSelectedNodes, wireMode, setWireMode });

  async function save() {
    if (!id || !currentUser) return;
    setSaveStatus("saving");
    try {
      const updated = await substationsService.updateTopology(id, currentUser.id, storeToTopology(nodes, edges));
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

  const substationOptions = (allSubstations ?? []).filter((s) => s.id !== id).map((s) => ({ id: s.id, name: s.name }));

  if (!substation) {
    return <p className="p-8 text-slate-500">Carregando subestação...</p>;
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
        <div className="flex items-center gap-3">
          <Link to="/substations" className="text-sm text-slate-500 hover:text-slate-700">
            ← Subestações
          </Link>
          <h1 className="text-sm font-semibold text-slate-900">
            {substation.name} <span className="font-normal text-slate-400">({substation.sigla})</span>
          </h1>
        </div>
        {ownsLock && (
          <div className="flex items-center gap-3">
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
          </div>
        )}
      </header>

      {lockedByName && !ownsLock && <LockBanner lockedByName={lockedByName} />}

      {connectError && (
        <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {connectError}
          <button type="button" onClick={() => setConnectError(null)} className="text-red-400 hover:text-red-600">
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {ownsLock && (
          <Toolbar
            nodes={nodes}
            rotateSelectedNodes={rotateSelectedNodes}
            wireMode={wireMode}
            setWireMode={setWireMode}
          />
        )}
        <div className="flex-1">
          <ReactFlowProvider>
            <Canvas
              topology={{
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
              }}
              readOnly={!ownsLock}
              fitView={hasInitialNodesRef.current ?? false}
              onNodeDoubleClick={handleNodeDoubleClick}
              onConnectError={setConnectError}
              onDropEquipment={handleDropEquipment}
            />
          </ReactFlowProvider>
        </div>
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
