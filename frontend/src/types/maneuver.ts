export type ManeuverAction = "ABRIR" | "FECHAR";
export type ManeuverStepResponsibility = "LOCAL" | "CENTRO";
export type ManeuverStatus = "RASCUNHO" | "FINALIZADA";

export interface ManeuverStep {
  id: string;
  order: number;
  description: string;
  equipment_id: string | null;
  action: ManeuverAction | null;
  responsibility: ManeuverStepResponsibility;
}

export interface ManeuverHeader {
  data: string | null;
  responsavel: string | null;
  area: string | null;
  substations: string[];
  descricao_isolamento: string | null;
}

export interface Maneuver {
  id: string;
  title: string;
  /** Número oficial "0001/2026", atribuído automaticamente pelo backend no
   *  primeiro PUT com dados reais — null até lá, nunca editável no frontend. */
  number: string | null;
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
