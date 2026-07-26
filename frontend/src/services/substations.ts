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

  /**
   * Fire-and-forget: usado em beforeunload/unmount, onde não dá pra esperar a resposta.
   * Um DELETE com corpo JSON é cross-origin "não simples" (exige preflight CORS) — no
   * beforeunload esse round-trip pode não terminar a tempo de a aba fechar, perdendo o
   * unlock silenciosamente. `navigator.sendBeacon` resolve isso: só manda POST (por
   * isso o alias `/unlock` no backend) e, com um Blob sem `type`, vai sem cabeçalho
   * Content-Type — sem método/header "não simples", vira requisição simples e não
   * precisa de preflight.
   */
  releaseLockBeacon: (id: string, userId: string) => {
    const url = `${API_URL}/substations/${id}/unlock`;
    const body = new Blob([JSON.stringify({ user_id: userId })]);
    if (navigator.sendBeacon?.(url, body)) return;
    fetch(url, { method: "POST", body, keepalive: true }).catch(() => {});
  },
};
