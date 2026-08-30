import { errors, jwtVerify, SignJWT } from "jose";
import { config } from "../config/env.ts";
import { UnauthorizedError } from "../shared/http/HttpError.ts";
import type { AuthenticatedUser } from "./types.ts";

const secretKey = new TextEncoder().encode(config.jwtSecret);

export async function signAccessToken(user: AuthenticatedUser): Promise<string> {
  return new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(config.jwtExpiresIn)
    .sign(secretKey);
}

export async function verifyAccessToken(token: string): Promise<AuthenticatedUser> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (typeof payload.sub !== "string" || typeof payload.email !== "string" || typeof payload.role !== "string") {
      throw new UnauthorizedError("Invalid token payload");
    }
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role as AuthenticatedUser["role"],
    };
  } catch (error) {
    if (error instanceof errors.JOSEError) {
      throw new UnauthorizedError("Invalid or expired token");
    }
    throw error;
  }
}
