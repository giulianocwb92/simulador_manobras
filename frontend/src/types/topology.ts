import type { Node } from "@xyflow/react";

export const VOLTAGE_LEVELS = [230, 138, 88, 69, 34.5, 13.8] as const;
export type VoltageLevel = (typeof VOLTAGE_LEVELS)[number];

export { VOLTAGE_COLORS } from "../constants/voltageColors";

export type EquipmentState = "aberto" | "fechado";
export type Rotation = 0 | 90 | 180 | 270;

interface BaseEquipmentData extends Record<string, unknown> {
  rotation?: Rotation;
}

export type BarraTipo = "principal" | "transferencia" | "dupla";

export interface BarraData extends BaseEquipmentData {
  tipo: BarraTipo;
  fonte: boolean;
  tensao: VoltageLevel;
  nome: string;
}

export interface DJData extends BaseEquipmentData {
  label: string;
  numero: string;
  estado: EquipmentState;
}

export interface CHData extends BaseEquipmentData {
  label: string;
  numero: string;
  estado: EquipmentState;
}

export interface TFData extends BaseEquipmentData {
  label: string;
  identificador: string;
  tensao_at: VoltageLevel;
  tensao_bt: VoltageLevel;
  potencia_mva?: number;
}

export interface TF3Data extends BaseEquipmentData {
  label: string;
  identificador: string;
  tensao_at: VoltageLevel;
  tensao_bt: VoltageLevel;
  tensao_ter: VoltageLevel;
  potencia_mva?: number;
}

export interface ReligadorData extends BaseEquipmentData {
  label: string;
  nome: string;
  estado: EquipmentState;
}

export interface TPData extends BaseEquipmentData {
  label: string;
}

export interface TCData extends BaseEquipmentData {
  label: string;
}

export interface LinhaData extends Record<string, unknown> {
  label: string;
  nome: string;
  destino_se_id?: string | null;
  destino_se_nome?: string | null;
}

export type EquipmentKind =
  | "barra"
  | "disjuntor"
  | "chave"
  | "transformador"
  | "tf3"
  | "religador"
  | "tp"
  | "tc"
  | "linha";

export type BarraNodeType = Node<BarraData, "barra">;
export type DJNodeType = Node<DJData, "disjuntor">;
export type CHNodeType = Node<CHData, "chave">;
export type TFNodeType = Node<TFData, "transformador">;
export type TF3NodeType = Node<TF3Data, "tf3">;
export type ReligadorNodeType = Node<ReligadorData, "religador">;
export type TPNodeType = Node<TPData, "tp">;
export type TCNodeType = Node<TCData, "tc">;
export type LinhaNodeType = Node<LinhaData, "linha">;

export type TopologyNode =
  | BarraNodeType
  | DJNodeType
  | CHNodeType
  | TFNodeType
  | TF3NodeType
  | ReligadorNodeType
  | TPNodeType
  | TCNodeType
  | LinhaNodeType;

/**
 * Tensão associada a um terminal específico de um nó, usada tanto para
 * validar conexões quanto para colorir o wire por nível de tensão.
 */
export function tensaoDoTerminal(
  node: TopologyNode | undefined,
  handleId: string | null | undefined
): VoltageLevel | undefined {
  if (!node) return undefined;
  switch (node.type) {
    case "barra":
      return node.data.tensao;
    // Convenção: terminal-a = lado AT (Alta), terminal-b = lado BT (Baixa),
    // terminal-ter = terciário — mantém a nomenclatura genérica a/b/ter
    // usada por todos os equipamentos rotacionáveis (ver §1 da spec).
    case "transformador":
      if (handleId === "terminal-a") return node.data.tensao_at;
      if (handleId === "terminal-b") return node.data.tensao_bt;
      return undefined;
    case "tf3":
      if (handleId === "terminal-a") return node.data.tensao_at;
      if (handleId === "terminal-b") return node.data.tensao_bt;
      if (handleId === "terminal-ter") return node.data.tensao_ter;
      return undefined;
    default:
      return undefined;
  }
}
