import { api, ApiError } from "./api";
import type { User } from "../types/user";

export const usersService = {
  list: () => api.get<User[]>("/users"),

  /** Sem autenticação na v1: cria o usuário pelo nome+email ou reaproveita se o email já existir. */
  async identify(name: string, email: string): Promise<User> {
    try {
      return await api.post<User>("/users", { name, email });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const users = await usersService.list();
        const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (existing) return existing;
      }
      throw err;
    }
  },
};
