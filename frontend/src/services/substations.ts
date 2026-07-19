import { api } from "./api";
import type { Substation, SubstationCreate } from "../types/substation";

export const substationsService = {
  list: () => api.get<Substation[]>("/substations"),
  create: (payload: SubstationCreate) => api.post<Substation>("/substations", payload),
};
