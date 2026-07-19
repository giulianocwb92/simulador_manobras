import type { Node } from "@xyflow/react";

export const VOLTAGE_LEVELS = [230, 138, 88, 69, 34.5, 13.8] as const;
export type VoltageLevel = (typeof VOLTAGE_LEVELS)[number];

export const VOLTAGE_COLORS: Record<VoltageLevel, string> = {
  230: "#FF6B00",
  138: "#CC0000",
  88: "#7B2D8B",
  69: "#003087",
  34.5: "#006400",
  13.8: "#0066CC",
};

export type EquipmentState = "aberto" | "fechado";

export interface BarraData extends Record<string, unknown> {
  label: string;
  tensao: VoltageLevel;
}

export interface DJData extends Record<string, unknown> {
  label: string;
  numero: string;
  estado: EquipmentState;
}

export interface CHData extends Record<string, unknown> {
  label: string;
  numero: string;
  estado: EquipmentState;
}

export interface TFData extends Record<string, unknown> {
  label: string;
  identificador: string;
  tensao_at: VoltageLevel;
  tensao_bt: VoltageLevel;
  tensao_ter?: VoltageLevel;
  potencia_mva?: number;
}

export interface ReligadorData extends Record<string, unknown> {
  label: string;
  nome: string;
  estado: EquipmentState;
}

export interface TPData extends Record<string, unknown> {
  label: string;
}

export interface TCData extends Record<string, unknown> {
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
  | "religador"
  | "tp"
  | "tc"
  | "linha";

export type BarraNodeType = Node<BarraData, "barra">;
export type DJNodeType = Node<DJData, "disjuntor">;
export type CHNodeType = Node<CHData, "chave">;
export type TFNodeType = Node<TFData, "transformador">;
export type ReligadorNodeType = Node<ReligadorData, "religador">;
export type TPNodeType = Node<TPData, "tp">;
export type TCNodeType = Node<TCData, "tc">;
export type LinhaNodeType = Node<LinhaData, "linha">;

export type TopologyNode =
  | BarraNodeType
  | DJNodeType
  | CHNodeType
  | TFNodeType
  | ReligadorNodeType
  | TPNodeType
  | TCNodeType
  | LinhaNodeType;
