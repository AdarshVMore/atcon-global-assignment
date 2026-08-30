import { Role } from "@atcon/database";
import { BadRequestError } from "../shared/http/HttpError.ts";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function assertValidEmail(email: unknown): asserts email is string {
  if (typeof email !== "string" || !EMAIL_PATTERN.test(email)) {
    throw new BadRequestError("A valid email is required");
  }
}

export function assertValidPassword(password: unknown): asserts password is string {
  if (typeof password !== "string" || password.length < 8) {
    throw new BadRequestError("Password must be at least 8 characters");
  }
}

export function assertValidName(name: unknown): asserts name is string {
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new BadRequestError("Name is required");
  }
}

export function assertValidRole(role: unknown): asserts role is Role {
  if (role !== Role.CANDIDATE && role !== Role.RECRUITER) {
    throw new BadRequestError("Role must be CANDIDATE or RECRUITER");
  }
}
