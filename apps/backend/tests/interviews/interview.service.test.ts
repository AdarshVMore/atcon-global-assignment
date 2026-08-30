import { describe, expect, test } from "bun:test";
import { InterviewStatus, JobStatus, Role, ScorecardRecommendation, type InterviewScorecard, type User } from "@atcon/database";
import { InterviewService } from "../../src/modules/interviews/interview.service.ts";
import type { NotificationService } from "../../src/modules/notifications/notification.service.ts";
import type { ApplicationRepository, ApplicationWithRelations } from "../../src/modules/applications/application.repository.ts";
import type { CandidateRepository, CandidateWithUser } from "../../src/modules/candidates/candidate.repository.ts";
import type { UserRepository } from "../../src/modules/auth/auth.repository.ts";
import type { InterviewRepository, InterviewWithScorecard } from "../../src/modules/interviews/interview.repository.ts";

const RECRUITER_ID = "recruiter-1";
const OTHER_RECRUITER_ID = "recruiter-2";
const CANDIDATE_USER_ID = "user-candidate-1";
const CANDIDATE_ID = "candidate-1";
const APPLICATION_ID = "application-1";
const INTERVIEW_ID = "interview-1";

const FUTURE_DATE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const PAST_DATE = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

function buildApplication(overrides: Partial<ApplicationWithRelations> = {}): ApplicationWithRelations {
  return {
    id: APPLICATION_ID,
    candidateId: CANDIDATE_ID,
    jobId: "job-1",
    currentStageId: "stage-1",
    resumeId: "resume-1",
    appliedAt: new Date(),
    rankingScore: null,
    rankingExplanation: null,
    rankedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    job: { id: "job-1", title: "Backend Engineer", recruiterId: RECRUITER_ID, status: JobStatus.PUBLISHED },
    currentStage: { id: "stage-1", jobId: "job-1", name: "Applied", order: 1, isTerminal: false, createdAt: new Date() },
    stageHistory: [],
    ...overrides,
  };
}

function buildInterview(overrides: Partial<InterviewWithScorecard> = {}): InterviewWithScorecard {
  return {
    id: INTERVIEW_ID,
    applicationId: APPLICATION_ID,
    interviewerId: RECRUITER_ID,
    scheduledAt: new Date(FUTURE_DATE),
    durationMinutes: 60,
    status: InterviewStatus.SCHEDULED,
    meetingUrl: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    scorecard: null,
    ...overrides,
  };
}

function fakeInterviewRepository(overrides: Partial<InterviewRepository> = {}): InterviewRepository {
  return {
    create: async (input) => buildInterview(input as Partial<InterviewWithScorecard>),
    findById: async () => buildInterview(),
    findByApplicationId: async () => [buildInterview()],
    update: async (_id, data) => buildInterview(data as Partial<InterviewWithScorecard>),
    updateStatus: async (_id, status, extra) => buildInterview({ status, ...extra }),
    createScorecard: async (input) => ({ id: "scorecard-1", createdAt: new Date(), ...input }) as InterviewScorecard,
    ...overrides,
  } as InterviewRepository;
}

function fakeApplicationRepository(overrides: Partial<ApplicationRepository> = {}): ApplicationRepository {
  return {
    findById: async () => buildApplication(),
    ...overrides,
  } as ApplicationRepository;
}

function fakeCandidateRepository(overrides: Partial<CandidateRepository> = {}): CandidateRepository {
  return {
    findByUserId: async () => ({ id: CANDIDATE_ID, userId: CANDIDATE_USER_ID }) as CandidateWithUser,
    findById: async () => ({ id: CANDIDATE_ID, userId: CANDIDATE_USER_ID }),
    ...overrides,
  } as CandidateRepository;
}

function fakeNotificationService(): NotificationService {
  return { notifyAsync: async () => {} } as unknown as NotificationService;
}

function fakeUserRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findById: async (id: string) => ({ id, role: Role.RECRUITER } as User),
    ...overrides,
  } as UserRepository;
}

function buildService(overrides: {
  interviewRepository?: Partial<InterviewRepository>;
  applicationRepository?: Partial<ApplicationRepository>;
  candidateRepository?: Partial<CandidateRepository>;
  userRepository?: Partial<UserRepository>;
} = {}) {
  return new InterviewService(
    fakeInterviewRepository(overrides.interviewRepository),
    fakeApplicationRepository(overrides.applicationRepository),
    fakeCandidateRepository(overrides.candidateRepository),
    fakeUserRepository(overrides.userRepository),
    fakeNotificationService(),
  );
}

describe("InterviewService.scheduleInterview", () => {
  test("rejects a recruiter who doesn't own the job", async () => {
    const service = buildService();

    await expect(
      service.scheduleInterview(OTHER_RECRUITER_ID, APPLICATION_ID, { scheduledAt: FUTURE_DATE, durationMinutes: 60 }),
    ).rejects.toThrow("You do not own the job this application belongs to");
  });

  test("rejects a past scheduledAt", async () => {
    const service = buildService();

    await expect(
      service.scheduleInterview(RECRUITER_ID, APPLICATION_ID, { scheduledAt: PAST_DATE, durationMinutes: 60 }),
    ).rejects.toThrow("scheduledAt must be in the future");
  });

  test("rejects a duration outside the allowed range", async () => {
    const service = buildService();

    await expect(
      service.scheduleInterview(RECRUITER_ID, APPLICATION_ID, { scheduledAt: FUTURE_DATE, durationMinutes: 5 }),
    ).rejects.toThrow("durationMinutes must be an integer");
  });

  test("rejects an interviewerId that isn't a recruiter", async () => {
    const service = buildService({ userRepository: { findById: async () => ({ id: "x", role: Role.CANDIDATE } as User) } });

    await expect(
      service.scheduleInterview(RECRUITER_ID, APPLICATION_ID, {
        scheduledAt: FUTURE_DATE,
        durationMinutes: 60,
        interviewerId: "candidate-posing-as-interviewer",
      }),
    ).rejects.toThrow("interviewerId must reference an existing recruiter");
  });

  test("defaults the interviewer to the scheduling recruiter", async () => {
    let createdInterviewerId: string | undefined;
    const service = buildService({
      interviewRepository: {
        create: async (input) => {
          createdInterviewerId = input.interviewerId ?? undefined;
          return buildInterview(input as Partial<InterviewWithScorecard>);
        },
      },
    });

    await service.scheduleInterview(RECRUITER_ID, APPLICATION_ID, { scheduledAt: FUTURE_DATE, durationMinutes: 60 });

    expect(createdInterviewerId).toBe(RECRUITER_ID);
  });
});

describe("InterviewService status transitions", () => {
  test("rejects rescheduling a cancelled interview", async () => {
    const service = buildService({ interviewRepository: { findById: async () => buildInterview({ status: InterviewStatus.CANCELLED }) } });

    await expect(
      service.rescheduleInterview(RECRUITER_ID, INTERVIEW_ID, { scheduledAt: FUTURE_DATE }),
    ).rejects.toThrow("Cannot modify an interview that is CANCELLED");
  });

  test("rejects cancelling an already completed interview", async () => {
    const service = buildService({ interviewRepository: { findById: async () => buildInterview({ status: InterviewStatus.COMPLETED }) } });

    await expect(service.cancelInterview(RECRUITER_ID, INTERVIEW_ID)).rejects.toThrow(
      "Cannot modify an interview that is COMPLETED",
    );
  });

  test("moves a scheduled interview to completed", async () => {
    const service = buildService();

    const result = await service.completeInterview(RECRUITER_ID, INTERVIEW_ID);

    expect(result.status).toBe(InterviewStatus.COMPLETED);
  });

  test("rejects mutations from a recruiter who doesn't own the job", async () => {
    const service = buildService();

    await expect(service.cancelInterview(OTHER_RECRUITER_ID, INTERVIEW_ID)).rejects.toThrow(
      "You do not own the job this application belongs to",
    );
  });
});

describe("InterviewService.submitScorecard", () => {
  test("rejects submitting a scorecard before the interview is completed", async () => {
    const service = buildService({ interviewRepository: { findById: async () => buildInterview({ status: InterviewStatus.SCHEDULED }) } });

    await expect(
      service.submitScorecard(RECRUITER_ID, INTERVIEW_ID, {
        technicalScore: 4,
        communicationScore: 4,
        problemSolvingScore: 4,
        recommendation: ScorecardRecommendation.YES,
      }),
    ).rejects.toThrow("Interview must be completed before submitting a scorecard");
  });

  test("rejects a score outside 1-5", async () => {
    const service = buildService({ interviewRepository: { findById: async () => buildInterview({ status: InterviewStatus.COMPLETED }) } });

    await expect(
      service.submitScorecard(RECRUITER_ID, INTERVIEW_ID, {
        technicalScore: 9,
        communicationScore: 4,
        problemSolvingScore: 4,
        recommendation: ScorecardRecommendation.YES,
      }),
    ).rejects.toThrow("technicalScore must be an integer between 1 and 5");
  });

  test("rejects an invalid recommendation", async () => {
    const service = buildService({ interviewRepository: { findById: async () => buildInterview({ status: InterviewStatus.COMPLETED }) } });

    await expect(
      service.submitScorecard(RECRUITER_ID, INTERVIEW_ID, {
        technicalScore: 4,
        communicationScore: 4,
        problemSolvingScore: 4,
        recommendation: "MAYBE",
      }),
    ).rejects.toThrow("recommendation must be one of");
  });

  test("rejects a duplicate scorecard submission", async () => {
    const service = buildService({
      interviewRepository: {
        findById: async () =>
          buildInterview({
            status: InterviewStatus.COMPLETED,
            scorecard: { id: "existing", interviewId: INTERVIEW_ID } as InterviewScorecard,
          }),
      },
    });

    await expect(
      service.submitScorecard(RECRUITER_ID, INTERVIEW_ID, {
        technicalScore: 4,
        communicationScore: 4,
        problemSolvingScore: 4,
        recommendation: ScorecardRecommendation.YES,
      }),
    ).rejects.toThrow("A scorecard has already been submitted for this interview");
  });

  test("submits a valid scorecard on a completed interview", async () => {
    const service = buildService({ interviewRepository: { findById: async () => buildInterview({ status: InterviewStatus.COMPLETED }) } });

    const scorecard = await service.submitScorecard(RECRUITER_ID, INTERVIEW_ID, {
      technicalScore: 5,
      communicationScore: 4,
      problemSolvingScore: 5,
      recommendation: ScorecardRecommendation.STRONG_YES,
      feedback: "Excellent candidate",
    });

    expect(scorecard.recommendation).toBe(ScorecardRecommendation.STRONG_YES);
  });
});

describe("InterviewService view authorization", () => {
  test("hides the interview from a candidate who doesn't own the application", async () => {
    const service = buildService({ candidateRepository: { findByUserId: async () => null } });

    await expect(
      service.getInterviewForViewer(INTERVIEW_ID, { id: "someone-else", email: "x@atcon.dev", role: Role.CANDIDATE }),
    ).rejects.toThrow("Interview not found");
  });

  test("lets the owning candidate view the interview", async () => {
    const service = buildService();

    const result = await service.getInterviewForViewer(INTERVIEW_ID, {
      id: CANDIDATE_USER_ID,
      email: "c@atcon.dev",
      role: Role.CANDIDATE,
    });

    expect(result.id).toBe(INTERVIEW_ID);
  });

  test("hides the interview from a recruiter who doesn't own the job", async () => {
    const service = buildService();

    await expect(
      service.getInterviewForViewer(INTERVIEW_ID, { id: OTHER_RECRUITER_ID, email: "r2@atcon.dev", role: Role.RECRUITER }),
    ).rejects.toThrow("Interview not found");
  });
});
