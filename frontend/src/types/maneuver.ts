export type ManeuverAction = "ABRIR" | "FECHAR";
export type ManeuverStepOrigin = "SIMULADOR" | "MANUAL";
export type ManeuverStatus = "RASCUNHO" | "FINALIZADA";

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

export interface Maneuver {
  id: string;
  title: string;
  status: ManeuverStatus;
  header: ManeuverHeader;
  /** Nomes reais das SEs vinculadas (via ManeuverSubstation no backend) —
   *  usar isso pra exibição, não `header.substations` (texto livre, nunca
   *  populado automaticamente). */
  substation_names: string[];
  steps: ManeuverStep[];
  created_by: string | null;
  created_at: string;
  finalized_at: string | null;
}
