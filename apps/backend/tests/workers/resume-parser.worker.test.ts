import { describe, expect, test } from "bun:test";
import { ResumeStatus, type Candidate, type Resume } from "@atcon/database";
import { UnrecoverableError, type Job } from "bullmq";
import { createResumeParseProcessor } from "../../src/workers/resume-parser.worker.ts";
import type { CandidateRepository } from "../../src/modules/candidates/candidate.repository.ts";
import type { ResumeInformationExtractor } from "../../src/modules/resumes/resumeInformationExtractor.ts";
import type { ResumeRepository, UpdateResumeStatusInput } from "../../src/modules/resumes/resume.repository.ts";
import type { ResumeStorage } from "../../src/infrastructure/storage/resumeStorage.ts";

const PDF_FIXTURE_PATH = new URL("../../src/modules/resumes/__fixtures__/sample-resume.pdf", import.meta.url).pathname;

function buildResume(overrides: Partial<Resume> = {}): Resume {
  return {
    id: "resume-1",
    candidateId: "candidate-1",
    fileUrl: "resumes/candidate-1/resume.pdf",
    originalFileName: "resume.pdf",
    mimeType: "application/pdf",
    fileHash: "hash",
    status: ResumeStatus.UPLOADED,
    parsedData: null,
    parseError: null,
    uploadedAt: new Date(),
    parsedAt: null,
    ...overrides,
  };
}

function fakeResumeRepository(overrides: Partial<ResumeRepository> = {}): ResumeRepository & {
  statusUpdates: UpdateResumeStatusInput[];
} {
  const statusUpdates: UpdateResumeStatusInput[] = [];
  return {
    statusUpdates,
    create: async () => buildResume(),
    findById: async () => buildResume(),
    findByCandidateAndHash: async () => null,
    findByCandidateId: async () => [],
    updateStatus: async (_id, input) => {
      statusUpdates.push(input);
      return buildResume(input as Partial<Resume>);
    },
    ...overrides,
  } as ResumeRepository & { statusUpdates: UpdateResumeStatusInput[] };
}

function fakeCandidateRepository(overrides: Partial<CandidateRepository> = {}): CandidateRepository {
  return {
    findById: async () => ({ id: "candidate-1", userId: "user-1", phone: null }) as Candidate,
    findByUserId: async () => null,
    updatePhone: async () => {
      throw new Error("not used");
    },
    ...overrides,
  } as CandidateRepository;
}

function fakeStorage(overrides: Partial<ResumeStorage> = {}): ResumeStorage {
  return {
    hash: () => "hash",
    buildKey: () => "key",
    upload: async () => {},
    delete: async () => {},
    download: async () => new Uint8Array(await Bun.file(PDF_FIXTURE_PATH).arrayBuffer()),
    ...overrides,
  } as ResumeStorage;
}

function buildJob(resumeId = "resume-1"): Job<{ resumeId: string }> {
  return { data: { resumeId } } as Job<{ resumeId: string }>;
}

describe("resumeParse worker processor", () => {
  test("skips a resume that is already PARSED (idempotent against redelivery)", async () => {
    const resumeRepository = fakeResumeRepository({ findById: async () => buildResume({ status: ResumeStatus.PARSED }) });
    const processor = createResumeParseProcessor(resumeRepository, fakeCandidateRepository(), fakeStorage(), null);

    await processor(buildJob());

    expect(resumeRepository.statusUpdates).toEqual([]);
  });

  test("does nothing if the resume no longer exists", async () => {
    const resumeRepository = fakeResumeRepository({ findById: async () => null });
    const processor = createResumeParseProcessor(resumeRepository, fakeCandidateRepository(), fakeStorage(), null);

    await processor(buildJob());

    expect(resumeRepository.statusUpdates).toEqual([]);
  });

  test("without an OpenRouter extractor, extracts text deterministically and marks PARSED", async () => {
    const resumeRepository = fakeResumeRepository();
    const processor = createResumeParseProcessor(resumeRepository, fakeCandidateRepository(), fakeStorage(), null);

    await processor(buildJob());

    expect(resumeRepository.statusUpdates[0]).toEqual({ status: ResumeStatus.PROCESSING });
    const finalUpdate = resumeRepository.statusUpdates[1];
    expect(finalUpdate?.status).toBe(ResumeStatus.PARSED);
    const data = finalUpdate?.parsedData as { rawText: string; structured: unknown };
    expect(data.rawText).toContain("Hello Resume");
    expect(data.structured).toBeNull();
  });

  test("with an extractor, stores structured data and backfills an empty candidate phone", async () => {
    const resumeRepository = fakeResumeRepository();
    let backfilledPhone: string | undefined;
    const candidateRepository = fakeCandidateRepository({
      updatePhone: async (_id, phone) => {
        backfilledPhone = phone;
        return { id: "candidate-1", userId: "user-1", phone } as never;
      },
    });
    const extractor = {
      extract: async () => ({
        fullName: "Chris Candidate",
        email: null,
        phone: "+1-555-0100",
        summary: null,
        skills: ["TypeScript"],
        yearsOfExperience: null,
        education: [],
        workExperience: [],
      }),
    } as unknown as ResumeInformationExtractor;

    const processor = createResumeParseProcessor(resumeRepository, candidateRepository, fakeStorage(), extractor);
    await processor(buildJob());

    const finalUpdate = resumeRepository.statusUpdates.at(-1);
    const data = finalUpdate?.parsedData as { structured: { skills: string[] } };
    expect(data.structured.skills).toEqual(["TypeScript"]);
    expect(backfilledPhone).toBe("+1-555-0100");
  });

  test("does not overwrite a candidate's existing phone", async () => {
    const candidateRepository = fakeCandidateRepository({
      findById: async () => ({ id: "candidate-1", userId: "user-1", phone: "+1-555-9999" }) as Candidate,
      updatePhone: async () => {
        throw new Error("updatePhone should not be called when a phone is already set");
      },
    });
    const extractor = {
      extract: async () => ({
        fullName: null,
        email: null,
        phone: "+1-555-0100",
        summary: null,
        skills: [],
        yearsOfExperience: null,
        education: [],
        workExperience: [],
      }),
    } as unknown as ResumeInformationExtractor;

    const processor = createResumeParseProcessor(fakeResumeRepository(), candidateRepository, fakeStorage(), extractor);

    await expect(processor(buildJob())).resolves.toBeUndefined();
  });

  test("lets an extraction failure propagate so the queue can retry", async () => {
    const extractor = {
      extract: async () => {
        throw new Error("OpenRouter timed out");
      },
    } as unknown as ResumeInformationExtractor;
    const processor = createResumeParseProcessor(fakeResumeRepository(), fakeCandidateRepository(), fakeStorage(), extractor);

    await expect(processor(buildJob())).rejects.toThrow("OpenRouter timed out");
  });

  test("fails an unsupported file format as unrecoverable instead of burning through retries", async () => {
    const resumeRepository = fakeResumeRepository({
      findById: async () => buildResume({ mimeType: "application/msword" }),
    });
    const processor = createResumeParseProcessor(resumeRepository, fakeCandidateRepository(), fakeStorage(), null);

    await expect(processor(buildJob())).rejects.toThrow(UnrecoverableError);
  });
});
