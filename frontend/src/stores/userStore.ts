import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "../types/user";

interface UserState {
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
  clearCurrentUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),
      clearCurrentUser: () => set({ currentUser: null }),
    }),
    { name: "simulador-manobras:current-user" }
  )
);
