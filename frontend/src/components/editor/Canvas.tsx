import { useCallback, useMemo, type DragEvent } from "react";
import { Background, ConnectionMode, Controls, MiniMap, ReactFlow, useReactFlow, type Connection } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEditorStore } from "../../stores/editorStore";
import { nodeTypes } from "../../nodes";
import { tensaoDoTerminal, VOLTAGE_COLORS, type EquipmentKind } from "../../types/topology";
import { WIRE_UNCONNECTED_STROKE } from "../../constants/voltageColors";
import { validateConnection } from "./connectionValidation";

interface CanvasProps {
  readOnly?: boolean;
  onNodeClick?: (nodeId: string) => void;
  onConnectError?: (message: string) => void;
  onDropEquipment?: (kind: EquipmentKind, position: { x: number; y: number }) => void;
}

export function Canvas({ readOnly = false, onNodeClick, onConnectError, onDropEquipment }: CanvasProps) {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const onNodesChange = useEditorStore((s) => s.onNodesChange);
  const onEdgesChange = useEditorStore((s) => s.onEdgesChange);
  const addEdgeToStore = useEditorStore((s) => s.addEdge);
  const { screenToFlowPosition } = useReactFlow();

  const handleConnect = useCallback(
    (connection: Connection) => {
      const result = validateConnection(connection, nodes);
      if (!result.ok) {
        onConnectError?.(result.message ?? "Conexão inválida");
        return;
      }
      addEdgeToStore(connection);
    },
    [nodes, addEdgeToStore, onConnectError]
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

  const styledEdges = useMemo(
    () =>
      edges.map((edge) => {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        const targetNode = nodes.find((n) => n.id === edge.target);
        const tensao =
          tensaoDoTerminal(sourceNode, edge.sourceHandle) ?? tensaoDoTerminal(targetNode, edge.targetHandle);
        const stroke = tensao !== undefined ? VOLTAGE_COLORS[tensao] : WIRE_UNCONNECTED_STROKE;
        return { ...edge, type: "step", style: { ...edge.style, stroke, strokeWidth: 2 } };
      }),
    [edges, nodes]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={styledEdges}
      nodeTypes={nodeTypes}
      onNodesChange={readOnly ? undefined : onNodesChange}
      onEdgesChange={readOnly ? undefined : onEdgesChange}
      onConnect={readOnly ? undefined : handleConnect}
      onNodeClick={(_, node) => onNodeClick?.(node.id)}
      onDrop={readOnly ? undefined : handleDrop}
      onDragOver={readOnly ? undefined : handleDragOver}
      connectionMode={ConnectionMode.Loose}
      snapToGrid
      snapGrid={[20, 20]}
      nodesDraggable={!readOnly}
      nodesConnectable={!readOnly}
      elementsSelectable={!readOnly}
      fitView
    >
      <Background gap={20} />
      <Controls />
      <MiniMap pannable zoomable />
    </ReactFlow>
  );
}
