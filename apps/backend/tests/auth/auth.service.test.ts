import { describe, expect, test } from "bun:test";
import { Prisma, Role, type User } from "@atcon/database";
import { AuthService } from "../../src/modules/auth/auth.service.ts";
import { hashPassword } from "../../src/modules/auth/password.ts";
import { verifyAccessToken } from "../../src/modules/auth/token.ts";
import type { UserRepository } from "../../src/modules/auth/auth.repository.ts";

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "candidate@atcon.dev",
    name: "Chris Candidate",
    passwordHash: "",
    role: Role.CANDIDATE,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function fakeRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findByEmail: async () => null,
    findById: async () => null,
    createWithRole: async (input) => buildUser({ email: input.email, name: input.name, role: input.role }),
    ...overrides,
  } as UserRepository;
}

describe("AuthService.register", () => {
  test("rejects an invalid email", async () => {
    const service = new AuthService(fakeRepository());

    await expect(
      service.register({ email: "not-an-email", password: "password123", name: "Chris", role: "CANDIDATE" }),
    ).rejects.toThrow("A valid email is required");
  });

  test("rejects a short password", async () => {
    const service = new AuthService(fakeRepository());

    await expect(
      service.register({ email: "chris@atcon.dev", password: "short", name: "Chris", role: "CANDIDATE" }),
    ).rejects.toThrow("Password must be at least 8 characters");
  });

  test("rejects an invalid role", async () => {
    const service = new AuthService(fakeRepository());

    await expect(
      service.register({ email: "chris@atcon.dev", password: "password123", name: "Chris", role: "ADMIN" }),
    ).rejects.toThrow("Role must be CANDIDATE or RECRUITER");
  });

  test("maps a duplicate email to a conflict", async () => {
    const repository = fakeRepository({
      createWithRole: async () => {
        throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
          clientVersion: "7.10.0",
          meta: { target: ["email"] },
        });
      },
    });
    const service = new AuthService(repository);

    await expect(
      service.register({ email: "chris@atcon.dev", password: "password123", name: "Chris", role: "CANDIDATE" }),
    ).rejects.toThrow("An account with this email already exists");
  });

  test("maps the pg driver adapter's constraint-name error shape to a conflict", async () => {
    const repository = fakeRepository({
      createWithRole: async () => {
        throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
          clientVersion: "7.10.0",
          meta: { driverAdapterError: { cause: { constraint: { index: "User_email_key" } } } },
        });
      },
    });
    const service = new AuthService(repository);

    await expect(
      service.register({ email: "chris@atcon.dev", password: "password123", name: "Chris", role: "CANDIDATE" }),
    ).rejects.toThrow("An account with this email already exists");
  });

  test("issues a token carrying the new user's identity", async () => {
    const service = new AuthService(fakeRepository());

    const result = await service.register({
      email: "chris@atcon.dev",
      password: "password123",
      name: "Chris",
      role: "CANDIDATE",
    });

    const claims = await verifyAccessToken(result.token);
    expect(claims.id).toBe("user-1");
    expect(result.user.email).toBe("chris@atcon.dev");
  });
});

describe("AuthService.login", () => {
  test("rejects a nonexistent email without revealing that", async () => {
    const service = new AuthService(fakeRepository({ findByEmail: async () => null }));

    await expect(service.login({ email: "ghost@atcon.dev", password: "password123" })).rejects.toThrow(
      "Invalid email or password",
    );
  });

  test("rejects the wrong password with the same message as a nonexistent email", async () => {
    const passwordHash = await hashPassword("correct-password");
    const repository = fakeRepository({ findByEmail: async () => buildUser({ passwordHash }) });
    const service = new AuthService(repository);

    await expect(service.login({ email: "candidate@atcon.dev", password: "wrong-password" })).rejects.toThrow(
      "Invalid email or password",
    );
  });

  test("succeeds with the correct password", async () => {
    const passwordHash = await hashPassword("correct-password");
    const repository = fakeRepository({ findByEmail: async () => buildUser({ passwordHash }) });
    const service = new AuthService(repository);

    const result = await service.login({ email: "candidate@atcon.dev", password: "correct-password" });

    expect(result.user.id).toBe("user-1");
    expect(typeof result.token).toBe("string");
  });
});
