import { useCallback, useMemo, type DragEvent, type MouseEvent as ReactMouseEvent } from "react";
import { Background, ConnectionMode, Controls, MiniMap, ReactFlow, useReactFlow, type Connection, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEditorStore } from "../../stores/editorStore";
import { nodeTypes } from "../../nodes";
import { VOLTAGE_COLORS, type BarraData, type EquipmentKind } from "../../types/topology";
import { WIRE_UNCONNECTED_STROKE } from "../../constants/voltageColors";
import { computeVoltageMap, portKey } from "../../utils/energization";
import { computeBarraLength, GRID } from "../../utils/barraLayout";
import { validateConnection } from "./connectionValidation";
import { WirePreview } from "./WirePreview";

interface CanvasProps {
  readOnly?: boolean;
  /** Modo GRAVANDO: clique em DJ/CH/Religador alterna estado em vez de abrir o modal de propriedades. */
  recording?: boolean;
  onNodeDoubleClick?: (nodeId: string) => void;
  onEquipmentToggle?: (nodeId: string) => void;
  onConnectError?: (message: string) => void;
  onDropEquipment?: (kind: EquipmentKind, position: { x: number; y: number }) => void;
}

export function Canvas({
  readOnly = false,
  recording = false,
  onNodeDoubleClick,
  onEquipmentToggle,
  onConnectError,
  onDropEquipment,
}: CanvasProps) {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const onNodesChange = useEditorStore((s) => s.onNodesChange);
  const onEdgesChange = useEditorStore((s) => s.onEdgesChange);
  const addEdgeToStore = useEditorStore((s) => s.addEdge);
  const removeEdge = useEditorStore((s) => s.removeEdge);
  const wireMode = useEditorStore((s) => s.wireMode);
  const wirePending = useEditorStore((s) => s.wirePending);
  const startWire = useEditorStore((s) => s.startWire);
  const cancelWire = useEditorStore((s) => s.cancelWire);
  const addBarHandle = useEditorStore((s) => s.addBarHandle);
  const { screenToFlowPosition } = useReactFlow();

  const completeConnection = useCallback(
    (connection: Connection) => {
      const result = validateConnection(connection, nodes, edges);
      if (!result.ok) {
        onConnectError?.(result.message ?? "Conexão inválida");
        return false;
      }
      addEdgeToStore(connection);
      return true;
    },
    [nodes, edges, addEdgeToStore, onConnectError]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      completeConnection(connection);
    },
    [completeConnection]
  );

  // Registra o clique num handle (fixo ou dinâmico de barra) enquanto a ferramenta
  // Wire está ativa: primeiro clique inicia o wire, segundo finaliza (ver Correção 2).
  const handleWireTarget = useCallback(
    (nodeId: string, handleId: string, flowPosition: { x: number; y: number }) => {
      if (!wirePending) {
        startWire({ sourceNodeId: nodeId, sourceHandleId: handleId, sourcePosition: flowPosition });
        return;
      }
      if (wirePending.sourceNodeId === nodeId && wirePending.sourceHandleId === handleId) {
        return;
      }
      completeConnection({
        source: wirePending.sourceNodeId,
        sourceHandle: wirePending.sourceHandleId,
        target: nodeId,
        targetHandle: handleId,
      });
      cancelWire();
    },
    [wirePending, startWire, completeConnection, cancelWire]
  );

  const handleClickCapture = useCallback(
    (event: ReactMouseEvent) => {
      if (!wireMode) return;
      const target = event.target as HTMLElement;

      const handleEl = target.closest<HTMLElement>(".react-flow__handle");
      if (handleEl) {
        const nodeId = handleEl.dataset.nodeid;
        const handleId = handleEl.dataset.handleid;
        if (nodeId && handleId) {
          event.stopPropagation();
          const rect = handleEl.getBoundingClientRect();
          const flowPosition = screenToFlowPosition({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          });
          handleWireTarget(nodeId, handleId, flowPosition);
        }
        return;
      }

      const barraEl = target.closest<HTMLElement>("[data-barra-id]");
      if (barraEl) {
        event.stopPropagation();
        const nodeId = barraEl.dataset.barraId!;
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) return;
        const rotation = (node.data as { rotation?: number }).rotation ?? 0;
        const isHorizontal = rotation === 90 || rotation === 270;
        const rect = barraEl.getBoundingClientRect();
        // Posição ao longo da barra calculada em espaço de fluxo (não em px de
        // tela, que variam com o zoom) e arredondada pro mesmo grid dos nós —
        // sem isso o handle cai num pixel qualquer e o wire nunca fica reto.
        const flowClick = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const length = computeBarraLength(((node.data as BarraData).handles ?? []).length);
        const along = isHorizontal ? flowClick.x - node.position.x : flowClick.y - node.position.y;
        const snappedAlong = Math.min(length, Math.max(0, Math.round(along / GRID) * GRID));
        const position = length === 0 ? 0 : snappedAlong / length;
        // Perpendicular ao comprimento: metade de cá = "inicio" (esquerda/cima),
        // metade de lá = "fim" (direita/baixo) — decide de qual lado da barra
        // o handle novo sai (ver Correção "handles dos dois lados").
        const perpRaw = isHorizontal
          ? (event.clientY - rect.top) / rect.height
          : (event.clientX - rect.left) / rect.width;
        const lado: "inicio" | "fim" = perpRaw < 0.5 ? "inicio" : "fim";
        const handleId = addBarHandle(nodeId, position, lado);
        handleWireTarget(nodeId, handleId, flowClick);
      }
    },
    [wireMode, nodes, addBarHandle, handleWireTarget, screenToFlowPosition]
  );

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const kind = event.dataTransfer.getData("application/x-equipment-kind") as EquipmentKind;
      if (!kind) return;
      const raw = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      // Um nó recém-solto do toolbar nunca passava pelo `snapToGrid` do
      // ReactFlow (que só se aplica ao ARRASTAR um nó já existente) — cada
      // componente nascia na posição exata do cursor, então dois componentes
      // soltos em momentos diferentes praticamente nunca caíam na mesma linha
      // do grid, mesmo tendo a mesma altura de caixa (ex.: DJ/CH/Linha, todas
      // 24px) — os handles pareciam "desalinhados" entre si por causa disso.
      const position = { x: Math.round(raw.x / GRID) * GRID, y: Math.round(raw.y / GRID) * GRID };
      onDropEquipment?.(kind, position);
    },
    [screenToFlowPosition, onDropEquipment]
  );

  // Modo GRAVANDO: clique num DJ/CH/Religador alterna estado + gera passo (ver
  // SubstationEditorPage.tsx). Fora desse modo, o clique simples não faz nada
  // (duplo clique abre o modal de propriedades, ver onNodeDoubleClick abaixo).
  const handleNodeClick = useCallback(
    (_event: ReactMouseEvent, node: { id: string }) => {
      if (!recording) return;
      onEquipmentToggle?.(node.id);
    },
    [recording, onEquipmentToggle]
  );

  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Mapa de energização real: só propaga tensão através de DJ/CH/Religador
  // fechados, então o wire depois de um equipamento aberto fica cinza.
  const energizedVoltages = useMemo(() => computeVoltageMap(nodes, edges), [nodes, edges]);

  // Barra de transferência não semeia tensão própria (ver computeVoltageMap) —
  // só recebe cor quando um caminho fechado a alcança. Injeta o resultado em
  // `data.energizedTensao` numa cópia dos nós (não no estado canônico da
  // store, mesmo motivo de styledEdges abaixo) pra BarraNode colorir.
  const styledNodes = useMemo(
    () =>
      nodes.map((node) => {
        if (node.type !== "barra" || node.data.tipo !== "transferencia") return node;
        const tensao = node.data.handles
          .map((h) => energizedVoltages.get(portKey(node.id, h.id)))
          .find((v) => v !== undefined);
        return { ...node, data: { ...node.data, energizedTensao: tensao } };
      }),
    [nodes, energizedVoltages]
  );

  const styledEdges = useMemo(
    () =>
      edges.map((edge) => {
        const tensao =
          energizedVoltages.get(portKey(edge.source, edge.sourceHandle)) ??
          energizedVoltages.get(portKey(edge.target, edge.targetHandle));
        const stroke = tensao !== undefined ? VOLTAGE_COLORS[tensao] : WIRE_UNCONNECTED_STROKE;
        return {
          ...edge,
          type: "step",
          style: {
            ...edge.style,
            stroke,
            strokeWidth: edge.selected ? 4 : 2,
            strokeDasharray: edge.selected ? "6 3" : undefined,
          },
        };
      }),
    [edges, energizedVoltages]
  );

  // Duplo clique num wire o remove direto — mais fácil de descobrir do que
  // selecionar e apertar Delete/Backspace.
  const handleEdgeDoubleClick = useCallback(
    (_event: ReactMouseEvent, edge: Edge) => {
      if (readOnly) return;
      removeEdge(edge.id);
    },
    [readOnly, removeEdge]
  );

  return (
    <div className="relative h-full w-full" onClickCapture={handleClickCapture}>
      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        nodeTypes={nodeTypes}
        onNodesChange={readOnly || recording ? undefined : onNodesChange}
        onEdgesChange={readOnly || recording ? undefined : onEdgesChange}
        onConnect={readOnly || wireMode || recording ? undefined : handleConnect}
        onNodeClick={readOnly ? undefined : handleNodeClick}
        onNodeDoubleClick={readOnly || wireMode || recording ? undefined : (_, node) => onNodeDoubleClick?.(node.id)}
        onDrop={readOnly || recording ? undefined : handleDrop}
        onDragOver={readOnly || recording ? undefined : handleDragOver}
        onEdgeDoubleClick={readOnly || recording ? undefined : handleEdgeDoubleClick}
        connectionMode={ConnectionMode.Loose}
        deleteKeyCode={readOnly || recording ? null : ["Backspace", "Delete"]}
        snapToGrid
        snapGrid={[GRID, GRID]}
        nodesDraggable={!readOnly && !wireMode && !recording}
        nodesConnectable={!readOnly && !wireMode && !recording}
        elementsSelectable={!readOnly}
        style={wireMode ? { cursor: "crosshair" } : undefined}
        fitView
      >
        <Background gap={GRID} />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
      <WirePreview />
    </div>
  );
}
