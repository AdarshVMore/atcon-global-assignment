import type { Role } from "./api";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}
