import { describe, expect, test } from "bun:test";
import { Prisma, ResumeStatus, type Resume } from "@atcon/database";
import type { Queue } from "bullmq";
import { ResumeService } from "./resume.service.ts";
import type { CandidateRepository, CandidateWithUser } from "./candidate.repository.ts";
import type { ResumeRepository } from "./resume.repository.ts";
import type { ResumeParseJobData } from "../queue/jobs.ts";
import type { ResumeStorage } from "../shared/storage/resumeStorage.ts";

const PDF_BYTES = new Uint8Array([1, 2, 3, 4]);

function fakeQueue(overrides: Partial<Queue<ResumeParseJobData>> = {}): Queue<ResumeParseJobData> {
  return {
    add: async () => ({}) as never,
    ...overrides,
  } as Queue<ResumeParseJobData>;
}

function fakeCandidateRepository(overrides: Partial<CandidateRepository> = {}): CandidateRepository {
  return {
    findByUserId: async () => ({ id: "candidate-1", userId: "user-1" }) as CandidateWithUser,
    updatePhone: async () => {
      throw new Error("not used");
    },
    ...overrides,
  } as CandidateRepository;
}

function fakeResumeRepository(overrides: Partial<ResumeRepository> = {}): ResumeRepository {
  return {
    create: async (input) =>
      ({
        id: "resume-1",
        status: ResumeStatus.UPLOADED,
        parsedData: null,
        parseError: null,
        uploadedAt: new Date(),
        parsedAt: null,
        ...input,
      }) as Resume,
    findByCandidateAndHash: async () => null,
    findByCandidateId: async () => [],
    ...overrides,
  } as ResumeRepository;
}

function fakeStorage(overrides: Partial<ResumeStorage> = {}): ResumeStorage {
  return {
    hash: () => "deadbeef",
    buildKey: (candidateId, name) => `resumes/${candidateId}/${name}`,
    upload: async () => {},
    delete: async () => {},
    ...overrides,
  } as ResumeStorage;
}

describe("ResumeService.uploadResume", () => {
  test("rejects an unsupported file type", async () => {
    const service = new ResumeService(fakeResumeRepository(), fakeCandidateRepository(), fakeStorage(), fakeQueue());

    await expect(
      service.uploadResume("user-1", { name: "resume.exe", type: "application/x-msdownload", data: PDF_BYTES }),
    ).rejects.toThrow("Resume must be a PDF or Word document");
  });

  test("rejects a duplicate upload of the same file by the same candidate", async () => {
    const service = new ResumeService(
      fakeResumeRepository({ findByCandidateAndHash: async () => ({ id: "existing" }) as Resume }),
      fakeCandidateRepository(),
      fakeStorage(),
      fakeQueue(),
    );

    await expect(
      service.uploadResume("user-1", { name: "resume.pdf", type: "application/pdf", data: PDF_BYTES }),
    ).rejects.toThrow("You have already uploaded this exact resume file");
  });

  test("does not touch storage when the file is a duplicate", async () => {
    let uploadCalled = false;
    const service = new ResumeService(
      fakeResumeRepository({ findByCandidateAndHash: async () => ({ id: "existing" }) as Resume }),
      fakeCandidateRepository(),
      fakeStorage({ upload: async () => { uploadCalled = true; } }),
      fakeQueue(),
    );

    await expect(
      service.uploadResume("user-1", { name: "resume.pdf", type: "application/pdf", data: PDF_BYTES }),
    ).rejects.toThrow();
    expect(uploadCalled).toBe(false);
  });

  test("cleans up the uploaded object if persisting the resume record fails", async () => {
    let deletedKey: string | undefined;
    const service = new ResumeService(
      fakeResumeRepository({
        create: async () => {
          throw new Error("db is down");
        },
      }),
      fakeCandidateRepository(),
      fakeStorage({ delete: async (key: string) => { deletedKey = key; } }),
      fakeQueue(),
    );

    await expect(
      service.uploadResume("user-1", { name: "resume.pdf", type: "application/pdf", data: PDF_BYTES }),
    ).rejects.toThrow("db is down");
    expect(deletedKey).toBe("resumes/candidate-1/resume.pdf");
  });

  test("maps a race-condition duplicate (DB constraint, not the pre-check) to a conflict", async () => {
    let deletedKey: string | undefined;
    const service = new ResumeService(
      fakeResumeRepository({
        create: async () => {
          throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion: "7.10.0",
            meta: { driverAdapterError: { cause: { constraint: { index: "Resume_candidateId_fileHash_key" } } } },
          });
        },
      }),
      fakeCandidateRepository(),
      fakeStorage({ delete: async (key: string) => { deletedKey = key; } }),
      fakeQueue(),
    );

    await expect(
      service.uploadResume("user-1", { name: "resume.pdf", type: "application/pdf", data: PDF_BYTES }),
    ).rejects.toThrow("You have already uploaded this exact resume file");
    expect(deletedKey).toBe("resumes/candidate-1/resume.pdf");
  });

  test("stores the resume metadata on success", async () => {
    const service = new ResumeService(fakeResumeRepository(), fakeCandidateRepository(), fakeStorage(), fakeQueue());

    const resume = await service.uploadResume("user-1", {
      name: "resume.pdf",
      type: "application/pdf",
      data: PDF_BYTES,
    });

    expect(resume.fileHash).toBe("deadbeef");
    expect(resume.status).toBe(ResumeStatus.UPLOADED);
  });

  test("enqueues a resume.parse job for the new resume", async () => {
    let enqueuedData: unknown;
    const service = new ResumeService(
      fakeResumeRepository(),
      fakeCandidateRepository(),
      fakeStorage(),
      fakeQueue({ add: async (_name, data) => { enqueuedData = data; return {} as never; } }),
    );

    const resume = await service.uploadResume("user-1", {
      name: "resume.pdf",
      type: "application/pdf",
      data: PDF_BYTES,
    });

    expect(enqueuedData).toEqual({ resumeId: resume.id });
  });

  test("still returns the created resume if enqueueing fails", async () => {
    const service = new ResumeService(
      fakeResumeRepository(),
      fakeCandidateRepository(),
      fakeStorage(),
      fakeQueue({
        add: async () => {
          throw new Error("redis is down");
        },
      }),
    );

    const resume = await service.uploadResume("user-1", {
      name: "resume.pdf",
      type: "application/pdf",
      data: PDF_BYTES,
    });

    expect(resume.id).toBe("resume-1");
  });
});
