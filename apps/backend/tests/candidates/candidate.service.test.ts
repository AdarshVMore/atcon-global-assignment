import { describe, expect, test } from "bun:test";
import { Prisma, Role, type Candidate, type Resume, type User } from "@atcon/database";
import { CandidateService } from "../../src/modules/candidates/candidate.service.ts";
import type { CandidateRepository, CandidateWithUser } from "../../src/modules/candidates/candidate.repository.ts";
import type { ApplicationRepository, ApplicationWithRelations } from "../../src/modules/applications/application.repository.ts";
import type { ResumeRepository } from "../../src/modules/resumes/resume.repository.ts";

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
    findByIdWithUser: async () => buildCandidate(),
    updatePhone: async (_id, phone) => buildCandidate({ phone }),
    ...overrides,
  } as CandidateRepository;
}

function fakeApplicationRepository(overrides: Partial<ApplicationRepository> = {}): ApplicationRepository {
  return {
    findById: async () =>
      ({
        id: "application-1",
        candidateId: "candidate-1",
        jobId: "job-1",
        resumeId: "resume-1",
        job: { id: "job-1", title: "Backend Engineer", recruiterId: "recruiter-1", status: "PUBLISHED" },
      }) as ApplicationWithRelations,
    ...overrides,
  } as ApplicationRepository;
}

function fakeResumeRepository(overrides: Partial<ResumeRepository> = {}): ResumeRepository {
  return {
    findById: async () => ({ id: "resume-1", candidateId: "candidate-1" }) as Resume,
    ...overrides,
  } as ResumeRepository;
}

function buildService(overrides: {
  candidate?: Partial<CandidateRepository>;
  application?: Partial<ApplicationRepository>;
  resume?: Partial<ResumeRepository>;
} = {}) {
  return new CandidateService(
    fakeRepository(overrides.candidate),
    fakeApplicationRepository(overrides.application),
    fakeResumeRepository(overrides.resume),
  );
}

describe("CandidateService.getProfile", () => {
  test("throws when no candidate profile exists for the user", async () => {
    const service = buildService({ candidate: { findByUserId: async () => null } });

    await expect(service.getProfile("user-1")).rejects.toThrow("Candidate profile not found");
  });
});

describe("CandidateService.updateProfile", () => {
  test("rejects an invalid phone number", async () => {
    const service = buildService();

    await expect(service.updateProfile("user-1", { phone: "abc" })).rejects.toThrow("A valid phone number is required");
  });

  test("leaves the profile untouched when no phone is provided", async () => {
    const service = buildService();

    const result = await service.updateProfile("user-1", {});

    expect(result.phone).toBeNull();
  });

  test("maps a duplicate phone number to a conflict", async () => {
    const service = buildService({
      candidate: {
        updatePhone: async () => {
          throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion: "7.10.0",
            meta: { driverAdapterError: { cause: { constraint: { index: "Candidate_phone_key" } } } },
          });
        },
      },
    });

    await expect(service.updateProfile("user-1", { phone: "+1-555-0100" })).rejects.toThrow(
      "This phone number is already associated with another account",
    );
  });

  test("updates the phone number", async () => {
    const service = buildService();

    const result = await service.updateProfile("user-1", { phone: "+1-555-0199" });

    expect(result.phone).toBe("+1-555-0199");
  });
});

describe("CandidateService.getProfileForRecruiter", () => {
  test("throws when the application does not exist", async () => {
    const service = buildService({ application: { findById: async () => null } });

    await expect(service.getProfileForRecruiter("recruiter-1", "application-1")).rejects.toThrow(
      "Application not found",
    );
  });

  test("throws when the requesting recruiter does not own the job", async () => {
    const service = buildService();

    await expect(service.getProfileForRecruiter("someone-else", "application-1")).rejects.toThrow(
      "Application not found",
    );
  });

  test("returns the candidate's profile and the resume that application used", async () => {
    const resume = { id: "resume-1", candidateId: "candidate-1" } as Resume;
    const service = buildService({ resume: { findById: async () => resume } });

    const result = await service.getProfileForRecruiter("recruiter-1", "application-1");

    expect(result.id).toBe("candidate-1");
    expect(result.user.name).toBe("Chris Candidate");
    expect(result.resume).toEqual(resume);
  });

  test("does not return the candidate's other resumes, only the one this application used", async () => {
    const findById = (async (id: string) => {
      if (id !== "resume-1") throw new Error(`unexpectedly fetched resume ${id}`);
      return { id: "resume-1", candidateId: "candidate-1" } as Resume;
    }) as ResumeRepository["findById"];
    const service = buildService({ resume: { findById } });

    const result = await service.getProfileForRecruiter("recruiter-1", "application-1");

    expect(result.resume?.id).toBe("resume-1");
  });

  test("returns a null resume when the application has none set", async () => {
    const service = buildService({ application: { findById: async () => ({
      id: "application-1",
      candidateId: "candidate-1",
      jobId: "job-1",
      resumeId: null,
      job: { id: "job-1", title: "Backend Engineer", recruiterId: "recruiter-1", status: "PUBLISHED" },
    }) as ApplicationWithRelations } });

    const result = await service.getProfileForRecruiter("recruiter-1", "application-1");

    expect(result.resume).toBeNull();
  });
});
