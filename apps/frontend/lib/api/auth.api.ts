import { apiClient } from "./client";
import type { AuthUser } from "@/types/auth";
import type { Role } from "@/types/api";

export interface AuthResult {
  user: AuthUser;
  token: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role: Role;
  phone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export const authApi = {
  register: (input: RegisterInput) => apiClient.post<AuthResult>("/auth/register", input),
  login: (input: LoginInput) => apiClient.post<AuthResult>("/auth/login", input),
  me: () => apiClient.get<{ user: AuthUser }>("/me"),
};
