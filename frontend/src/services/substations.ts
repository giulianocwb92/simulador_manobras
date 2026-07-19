import { API_URL, api } from "./api";
import type { Substation, SubstationCreate, Topology } from "../types/substation";

export const substationsService = {
  list: () => api.get<Substation[]>("/substations"),
  get: (id: string) => api.get<Substation>(`/substations/${id}`),
  create: (payload: SubstationCreate) => api.post<Substation>("/substations", payload),
  updateTopology: (id: string, userId: string, topology: Topology) =>
    api.put<Substation>(`/substations/${id}`, { user_id: userId, topology }),
  lock: (id: string, userId: string) => api.post<Substation>(`/substations/${id}/lock`, { user_id: userId }),
  unlock: (id: string, userId: string) => api.delete<Substation>(`/substations/${id}/lock`, { user_id: userId }),

  /** Fire-and-forget: usado em beforeunload/unmount, onde não dá pra esperar a resposta. */
  releaseLockBeacon: (id: string, userId: string) => {
    fetch(`${API_URL}/substations/${id}/lock`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
      keepalive: true,
    }).catch(() => {});
  },
};
