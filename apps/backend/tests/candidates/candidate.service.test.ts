import { describe, expect, test } from "bun:test";
import { Prisma, Role, type Candidate, type User } from "@atcon/database";
import { CandidateService } from "../../src/modules/candidates/candidate.service.ts";
import type { CandidateRepository, CandidateWithUser } from "../../src/modules/candidates/candidate.repository.ts";

function buildCandidate(overrides: Partial<Candidate> = {}): CandidateWithUser {
  const user: User = {
    id: "user-1",
    email: "candidate@atcon.dev",
    name: "Chris Candidate",
    passwordHash: "",
    role: Role.CANDIDATE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const candidate: Candidate = {
    id: "candidate-1",
    userId: "user-1",
    phone: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  return { ...candidate, user };
}

function fakeRepository(overrides: Partial<CandidateRepository> = {}): CandidateRepository {
  return {
    findByUserId: async () => buildCandidate(),
    updatePhone: async (_id, phone) => buildCandidate({ phone }),
    ...overrides,
  } as CandidateRepository;
}

describe("CandidateService.getProfile", () => {
  test("throws when no candidate profile exists for the user", async () => {
    const service = new CandidateService(fakeRepository({ findByUserId: async () => null }));

    await expect(service.getProfile("user-1")).rejects.toThrow("Candidate profile not found");
  });
});

describe("CandidateService.updateProfile", () => {
  test("rejects an invalid phone number", async () => {
    const service = new CandidateService(fakeRepository());

    await expect(service.updateProfile("user-1", { phone: "abc" })).rejects.toThrow("A valid phone number is required");
  });

  test("leaves the profile untouched when no phone is provided", async () => {
    const service = new CandidateService(fakeRepository());

    const result = await service.updateProfile("user-1", {});

    expect(result.phone).toBeNull();
  });

  test("maps a duplicate phone number to a conflict", async () => {
    const repository = fakeRepository({
      updatePhone: async () => {
        throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
          clientVersion: "7.10.0",
          meta: { driverAdapterError: { cause: { constraint: { index: "Candidate_phone_key" } } } },
        });
      },
    });
    const service = new CandidateService(repository);

    await expect(service.updateProfile("user-1", { phone: "+1-555-0100" })).rejects.toThrow(
      "This phone number is already associated with another account",
    );
  });

  test("updates the phone number", async () => {
    const service = new CandidateService(fakeRepository());

    const result = await service.updateProfile("user-1", { phone: "+1-555-0199" });

    expect(result.phone).toBe("+1-555-0199");
  });
});
