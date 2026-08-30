import { Prisma } from "@atcon/database";
import { ConflictError, NotFoundError, UnauthorizedError } from "../shared/http/HttpError.ts";
import type { LoginRequestBody, RegisterRequestBody } from "./dto.ts";
import { hashPassword, verifyPassword } from "./password.ts";
import { signAccessToken } from "./token.ts";
import { toAuthenticatedUser, toPublicUser, type PublicUser } from "./types.ts";
import { UserRepository } from "./user.repository.ts";
import { assertValidEmail, assertValidName, assertValidPassword, assertValidRole } from "./validation.ts";

export interface AuthResult {
  user: PublicUser;
  token: string;
}

function isEmailUniqueConstraintViolation(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  // The pg driver adapter reports the Postgres constraint name instead of
  // Prisma's usual `meta.target` column-name array.
  if (Array.isArray(error.meta?.target)) {
    return error.meta.target.includes("email");
  }

  const driverAdapterError = error.meta?.driverAdapterError as { cause?: { constraint?: { index?: string } } };
  const constraintIndex = driverAdapterError?.cause?.constraint?.index;
  return typeof constraintIndex === "string" && constraintIndex.toLowerCase().includes("email");
}

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  async register(input: RegisterRequestBody): Promise<AuthResult> {
    assertValidEmail(input.email);
    assertValidPassword(input.password);
    assertValidName(input.name);
    assertValidRole(input.role);
    const phone = typeof input.phone === "string" && input.phone.trim().length > 0 ? input.phone : undefined;

    const email = input.email.toLowerCase();
    const passwordHash = await hashPassword(input.password);

    let user;
    try {
      user = await this.userRepository.createWithRole({
        email,
        name: input.name.trim(),
        role: input.role,
        passwordHash,
        phone,
      });
    } catch (error) {
      if (isEmailUniqueConstraintViolation(error)) {
        throw new ConflictError("An account with this email already exists");
      }
      throw error;
    }

    const token = await signAccessToken(toAuthenticatedUser(user));
    return { user: toPublicUser(user), token };
  }

  async login(input: LoginRequestBody): Promise<AuthResult> {
    assertValidEmail(input.email);
    assertValidPassword(input.password);

    const user = await this.userRepository.findByEmail(input.email.toLowerCase());
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const token = await signAccessToken(toAuthenticatedUser(user));
    return { user: toPublicUser(user), token };
  }

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return toPublicUser(user);
  }
}
