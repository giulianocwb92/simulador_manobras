export type ManeuverAction = "ABRIR" | "FECHAR";
export type ManeuverStepOrigin = "SIMULADOR" | "MANUAL";

export interface ManeuverStep {
  id: string;
  order: number;
  description: string;
  equipment_id: string | null;
  action: ManeuverAction | null;
  origin: ManeuverStepOrigin;
}

export interface ManeuverHeader {
  numero: string | null;
  data: string | null;
  responsavel: string | null;
  area: string | null;
  substations: string[];
  descricao_isolamento: string | null;
}
