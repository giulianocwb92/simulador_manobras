import type { Connection, Edge, EdgeChange, NodeChange, XYPosition } from "@xyflow/react";
import type { BarraHandleLado, TopologyNode } from "../types/topology";

export interface WirePending {
  sourceNodeId: string;
  sourceHandleId: string;
  sourcePosition: XYPosition;
}

/**
 * Fatia comum de estado/ações de um canvas de topologia (nós, arestas,
 * ferramenta Wire, rotação) — implementada tanto por `editorStore` (cadastro
 * de SE, persistido) quanto por `sessionStore` (sessão de manobra efêmera).
 * `Canvas`/`Toolbar`/`WirePreview`/`useEditorShortcuts` dependem só desta
 * fatia, via prop, pra funcionar com qualquer uma das duas stores.
 */
export interface TopologyBindings {
  nodes: TopologyNode[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange<TopologyNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  addEdge: (connection: Connection) => void;
  removeEdge: (edgeId: string) => void;
  rotateSelectedNodes: () => void;
  wireMode: boolean;
  setWireMode: (active: boolean) => void;
  wirePending: WirePending | null;
  startWire: (pending: WirePending) => void;
  cancelWire: () => void;
  addBarHandle: (nodeId: string, position: number, lado: BarraHandleLado) => string;
}
