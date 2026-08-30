import type { Role, User } from "@atcon/database";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export function toAuthenticatedUser(user: User): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}
