import { api, API_URL } from "./api";
import type { Maneuver, ManeuverAction, ManeuverHeader, ManeuverStatus, ManeuverStep, ManeuverStepOrigin } from "../types/maneuver";

export interface ManeuverCreatePayload {
  title: string;
  header?: Partial<ManeuverHeader>;
  created_by?: string | null;
  substation_ids?: string[];
}

export interface ManeuverListFilters {
  se_id?: string;
  status?: ManeuverStatus;
  responsavel?: string;
  data_inicio?: string;
  data_fim?: string;
}

export interface ManeuverStepCreatePayload {
  description: string;
  equipment_id?: string | null;
  action?: ManeuverAction | null;
  origin?: ManeuverStepOrigin;
}

export const maneuversService = {
  list: (filters: ManeuverListFilters = {}) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    const query = params.toString();
    return api.get<Maneuver[]>(`/maneuvers${query ? `?${query}` : ""}`);
  },
  create: (payload: ManeuverCreatePayload) => api.post<Maneuver>("/maneuvers", payload),
  get: (id: string) => api.get<Maneuver>(`/maneuvers/${id}`),
  clone: (id: string) => api.post<Maneuver>(`/maneuvers/${id}/clone`, {}),
  updateHeader: (id: string, header: Partial<ManeuverHeader>) => api.put<Maneuver>(`/maneuvers/${id}`, { header }),
  addStep: (maneuverId: string, payload: ManeuverStepCreatePayload) =>
    api.post<ManeuverStep>(`/maneuvers/${maneuverId}/steps`, payload),
  updateStep: (maneuverId: string, stepId: string, description: string) =>
    api.put<ManeuverStep>(`/maneuvers/${maneuverId}/steps/${stepId}`, { description }),
  deleteStep: (maneuverId: string, stepId: string) => api.delete<void>(`/maneuvers/${maneuverId}/steps/${stepId}`),
  reorderSteps: (maneuverId: string, order: string[]) =>
    api.post<ManeuverStep[]>(`/maneuvers/${maneuverId}/steps/reorder`, { order }),
  finalize: (id: string) => api.post<Maneuver>(`/maneuvers/${id}/finalize`, {}),
  /** URL direta (não passa por `api.ts`/JSON) — o endpoint devolve o PDF com
   *  `Content-Disposition: attachment`, então um link normal já baixa o arquivo. */
  pdfUrl: (id: string) => `${API_URL}/maneuvers/${id}/pdf`,
};
