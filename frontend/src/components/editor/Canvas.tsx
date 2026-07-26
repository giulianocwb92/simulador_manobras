import { useCallback, useMemo, type DragEvent, type MouseEvent as ReactMouseEvent } from "react";
import { Background, ConnectionMode, Controls, MiniMap, ReactFlow, useReactFlow, type Connection, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEditorStore } from "../../stores/editorStore";
import { nodeTypes } from "../../nodes";
import { VOLTAGE_COLORS, type EquipmentKind } from "../../types/topology";
import { WIRE_UNCONNECTED_STROKE } from "../../constants/voltageColors";
import { computeVoltageMap, portKey } from "../../utils/energization";
import { validateConnection } from "./connectionValidation";
import { WirePreview } from "./WirePreview";

interface CanvasProps {
  readOnly?: boolean;
  onNodeDoubleClick?: (nodeId: string) => void;
  onConnectError?: (message: string) => void;
  onDropEquipment?: (kind: EquipmentKind, position: { x: number; y: number }) => void;
}

export function Canvas({ readOnly = false, onNodeDoubleClick, onConnectError, onDropEquipment }: CanvasProps) {
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
        const raw = isHorizontal
          ? (event.clientX - rect.left) / rect.width
          : (event.clientY - rect.top) / rect.height;
        const position = Math.min(1, Math.max(0, raw));
        const handleId = addBarHandle(nodeId, position);
        const flowPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        handleWireTarget(nodeId, handleId, flowPosition);
      }
    },
    [wireMode, nodes, addBarHandle, handleWireTarget, screenToFlowPosition]
  );

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const kind = event.dataTransfer.getData("application/x-equipment-kind") as EquipmentKind;
      if (!kind) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      onDropEquipment?.(kind, position);
    },
    [screenToFlowPosition, onDropEquipment]
  );

  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Mapa de energização real: só propaga tensão através de DJ/CH/Religador
  // fechados, então o wire depois de um equipamento aberto fica cinza.
  const energizedVoltages = useMemo(() => computeVoltageMap(nodes, edges), [nodes, edges]);

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
        nodes={nodes}
        edges={styledEdges}
        nodeTypes={nodeTypes}
        onNodesChange={readOnly ? undefined : onNodesChange}
        onEdgesChange={readOnly ? undefined : onEdgesChange}
        onConnect={readOnly || wireMode ? undefined : handleConnect}
        onNodeDoubleClick={readOnly || wireMode ? undefined : (_, node) => onNodeDoubleClick?.(node.id)}
        onDrop={readOnly ? undefined : handleDrop}
        onDragOver={readOnly ? undefined : handleDragOver}
        onEdgeDoubleClick={readOnly ? undefined : handleEdgeDoubleClick}
        connectionMode={ConnectionMode.Loose}
        deleteKeyCode={readOnly ? null : ["Backspace", "Delete"]}
        snapToGrid
        snapGrid={[10, 10]}
        nodesDraggable={!readOnly && !wireMode}
        nodesConnectable={!readOnly && !wireMode}
        elementsSelectable={!readOnly}
        style={wireMode ? { cursor: "crosshair" } : undefined}
        fitView
      >
        <Background gap={10} />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
      <WirePreview />
    </div>
  );
}
