import { describe, expect, test } from "bun:test";
import { JobStatus, Prisma, ResumeStatus, type Resume } from "@atcon/database";
import type { Queue } from "bullmq";
import { ResumeService } from "../../src/modules/resumes/resume.service.ts";
import type { ApplicationRepository, ApplicationWithRelations } from "../../src/modules/applications/application.repository.ts";
import type { CandidateRepository, CandidateWithUser } from "../../src/modules/candidates/candidate.repository.ts";
import type { ResumeRepository } from "../../src/modules/resumes/resume.repository.ts";
import type { ResumeParseJobData } from "../../src/queues/resume.queue.ts";
import type { ResumeStorage } from "../../src/infrastructure/storage/resumeStorage.ts";

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
    findById: async () =>
      ({
        id: "resume-1",
        candidateId: "candidate-1",
        fileUrl: "resumes/candidate-1/resume.pdf",
        originalFileName: "resume.pdf",
        mimeType: "application/pdf",
        status: ResumeStatus.PARSED,
      }) as Resume,
    ...overrides,
  } as ResumeRepository;
}

function fakeStorage(overrides: Partial<ResumeStorage> = {}): ResumeStorage {
  return {
    hash: () => "deadbeef",
    buildKey: (candidateId, name) => `resumes/${candidateId}/${name}`,
    upload: async () => {},
    delete: async () => {},
    download: async () => PDF_BYTES,
    ...overrides,
  } as ResumeStorage;
}

function fakeApplicationRepository(overrides: Partial<ApplicationRepository> = {}): ApplicationRepository {
  return {
    findById: async () =>
      ({
        id: "application-1",
        candidateId: "candidate-1",
        job: { id: "job-1", title: "Backend Engineer", recruiterId: "recruiter-1", status: JobStatus.PUBLISHED },
      }) as ApplicationWithRelations,
    ...overrides,
  } as ApplicationRepository;
}

function buildService(overrides: {
  resume?: Partial<ResumeRepository>;
  candidate?: Partial<CandidateRepository>;
  storage?: Partial<ResumeStorage>;
  queue?: Partial<Queue<ResumeParseJobData>>;
  application?: Partial<ApplicationRepository>;
} = {}): ResumeService {
  return new ResumeService(
    fakeResumeRepository(overrides.resume),
    fakeCandidateRepository(overrides.candidate),
    fakeStorage(overrides.storage),
    fakeQueue(overrides.queue),
    fakeApplicationRepository(overrides.application),
  );
}

describe("ResumeService.uploadResume", () => {
  test("rejects an unsupported file type", async () => {
    const service = buildService();

    await expect(
      service.uploadResume("user-1", { name: "resume.exe", type: "application/x-msdownload", data: PDF_BYTES }),
    ).rejects.toThrow("Resume must be a PDF or Word document");
  });

  test("rejects a duplicate upload of the same file by the same candidate", async () => {
    const service = buildService({
      resume: { findByCandidateAndHash: async () => ({ id: "existing" }) as Resume },
    });

    await expect(
      service.uploadResume("user-1", { name: "resume.pdf", type: "application/pdf", data: PDF_BYTES }),
    ).rejects.toThrow("You have already uploaded this exact resume file");
  });

  test("does not touch storage when the file is a duplicate", async () => {
    let uploadCalled = false;
    const service = buildService({
      resume: { findByCandidateAndHash: async () => ({ id: "existing" }) as Resume },
      storage: { upload: async () => { uploadCalled = true; } },
    });

    await expect(
      service.uploadResume("user-1", { name: "resume.pdf", type: "application/pdf", data: PDF_BYTES }),
    ).rejects.toThrow();
    expect(uploadCalled).toBe(false);
  });

  test("cleans up the uploaded object if persisting the resume record fails", async () => {
    let deletedKey: string | undefined;
    const service = buildService({
      resume: {
        create: async () => {
          throw new Error("db is down");
        },
      },
      storage: { delete: async (key: string) => { deletedKey = key; } },
    });

    await expect(
      service.uploadResume("user-1", { name: "resume.pdf", type: "application/pdf", data: PDF_BYTES }),
    ).rejects.toThrow("db is down");
    expect(deletedKey).toBe("resumes/candidate-1/resume.pdf");
  });

  test("maps a race-condition duplicate (DB constraint, not the pre-check) to a conflict", async () => {
    let deletedKey: string | undefined;
    const service = buildService({
      resume: {
        create: async () => {
          throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion: "7.10.0",
            meta: { driverAdapterError: { cause: { constraint: { index: "Resume_candidateId_fileHash_key" } } } },
          });
        },
      },
      storage: { delete: async (key: string) => { deletedKey = key; } },
    });

    await expect(
      service.uploadResume("user-1", { name: "resume.pdf", type: "application/pdf", data: PDF_BYTES }),
    ).rejects.toThrow("You have already uploaded this exact resume file");
    expect(deletedKey).toBe("resumes/candidate-1/resume.pdf");
  });

  test("stores the resume metadata on success", async () => {
    const service = buildService();

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
    const service = buildService({
      queue: { add: async (_name, data) => { enqueuedData = data; return {} as never; } },
    });

    const resume = await service.uploadResume("user-1", {
      name: "resume.pdf",
      type: "application/pdf",
      data: PDF_BYTES,
    });

    expect(enqueuedData).toEqual({ resumeId: resume.id });
  });

  test("still returns the created resume if enqueueing fails", async () => {
    const service = buildService({
      queue: {
        add: async () => {
          throw new Error("redis is down");
        },
      },
    });

    const resume = await service.uploadResume("user-1", {
      name: "resume.pdf",
      type: "application/pdf",
      data: PDF_BYTES,
    });

    expect(resume.id).toBe("resume-1");
  });
});

describe("ResumeService.getFileForRecruiter", () => {
  test("throws when the application does not exist", async () => {
    const service = buildService({ application: { findById: async () => null } });

    await expect(service.getFileForRecruiter("recruiter-1", "application-1", "resume-1")).rejects.toThrow(
      "Application not found",
    );
  });

  test("throws when the requesting recruiter does not own the job", async () => {
    const service = buildService();

    await expect(service.getFileForRecruiter("someone-else", "application-1", "resume-1")).rejects.toThrow(
      "Application not found",
    );
  });

  test("throws when the resume does not exist", async () => {
    const service = buildService({ resume: { findById: async () => null } });

    await expect(service.getFileForRecruiter("recruiter-1", "application-1", "resume-1")).rejects.toThrow(
      "Resume not found",
    );
  });

  test("throws when the resume belongs to a different candidate", async () => {
    const service = buildService({
      resume: { findById: async () => ({ id: "resume-1", candidateId: "someone-elses-candidate-id" }) as Resume },
    });

    await expect(service.getFileForRecruiter("recruiter-1", "application-1", "resume-1")).rejects.toThrow(
      "Resume not found",
    );
  });

  test("returns the file bytes for a resume owned by the applying candidate", async () => {
    const service = buildService();

    const result = await service.getFileForRecruiter("recruiter-1", "application-1", "resume-1");

    expect(result.bytes).toBe(PDF_BYTES);
    expect(result.resume.id).toBe("resume-1");
  });
});
