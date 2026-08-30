import type { Role } from "@atcon/database";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}
