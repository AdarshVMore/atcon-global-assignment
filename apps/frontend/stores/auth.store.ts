import { create } from "zustand";
import type { AuthUser } from "@/types/auth";

interface AuthState {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
}

// Session metadata only — the token itself lives in lib/auth/token.ts, not
// here, since Zustand state isn't persisted across a full page reload.
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
