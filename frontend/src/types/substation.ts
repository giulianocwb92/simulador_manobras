export interface TopologyNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface TopologyEdge {
  id: string;
  source: string;
  sourceHandle?: string | null;
  target: string;
  targetHandle?: string | null;
}

export interface Topology {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export interface Substation {
  id: string;
  name: string;
  sigla: string;
  topology: Topology;
  version: number;
  locked_by: string | null;
  locked_by_name: string | null;
  locked_at: string | null;
  created_at: string;
}

export interface SubstationCreate {
  name: string;
  sigla: string;
  topology?: Topology;
}
