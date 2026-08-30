import { InterviewStatus, NotificationType, Role, type InterviewScorecard } from "@atcon/database";
import type { ApplicationRepository, ApplicationWithRelations } from "../applications/application.repository.ts";
import type { AuthenticatedUser } from "../auth/types.ts";
import { UserRepository } from "../auth/user.repository.ts";
import { CandidateRepository } from "../candidates/candidate.repository.ts";
import type { NotificationService } from "../notifications/notification.service.ts";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../shared/http/HttpError.ts";
import { isUniqueConstraintViolation } from "../shared/prismaErrors.ts";
import type {
  RescheduleInterviewRequestBody,
  ScheduleInterviewRequestBody,
  SubmitScorecardRequestBody,
  UpdateInterviewRequestBody,
} from "./dto.ts";
import { InterviewRepository, type InterviewWithScorecard } from "./interview.repository.ts";
import { assertNotInThePast, assertValidRecommendation, assertValidScore, parseDurationMinutes, parseScheduledAt } from "./validation.ts";

function assertMutable(interview: InterviewWithScorecard): void {
  if (interview.status === InterviewStatus.CANCELLED || interview.status === InterviewStatus.COMPLETED) {
    throw new ConflictError(`Cannot modify an interview that is ${interview.status}`);
  }
}

export class InterviewService {
  constructor(
    private readonly interviewRepository: InterviewRepository,
    private readonly applicationRepository: ApplicationRepository,
    private readonly candidateRepository: CandidateRepository,
    private readonly userRepository: UserRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async scheduleInterview(
    recruiterId: string,
    applicationId: string,
    input: ScheduleInterviewRequestBody,
  ): Promise<InterviewWithScorecard> {
    const application = await this.requireOwnedApplication(applicationId, recruiterId);

    const scheduledAt = parseScheduledAt(input.scheduledAt);
    assertNotInThePast(scheduledAt);
    const durationMinutes = parseDurationMinutes(input.durationMinutes);

    let interviewerId = recruiterId;
    if (input.interviewerId !== undefined) {
      if (typeof input.interviewerId !== "string") {
        throw new BadRequestError("interviewerId must be a string");
      }
      const interviewer = await this.userRepository.findById(input.interviewerId);
      if (!interviewer || interviewer.role !== Role.RECRUITER) {
        throw new BadRequestError("interviewerId must reference an existing recruiter");
      }
      interviewerId = interviewer.id;
    }

    const meetingUrl = asOptionalString(input.meetingUrl);
    const notes = asOptionalString(input.notes);

    const interview = await this.interviewRepository.create({
      applicationId: application.id,
      interviewerId,
      scheduledAt,
      durationMinutes,
      meetingUrl,
      notes,
    });

    await this.notifyCandidate(
      application,
      NotificationType.INTERVIEW_SCHEDULED,
      "Interview scheduled",
      `An interview for ${application.job.title} has been scheduled for ${scheduledAt.toISOString()}.`,
    );

    return interview;
  }

  async getInterviewForViewer(interviewId: string, viewer: AuthenticatedUser): Promise<InterviewWithScorecard> {
    const interview = await this.requireInterview(interviewId);
    const application = await this.applicationRepository.findById(interview.applicationId);
    if (!application) {
      throw new NotFoundError("Interview not found");
    }
    await this.assertCanViewApplication(application, viewer);
    return interview;
  }

  async listInterviewsForApplication(applicationId: string, viewer: AuthenticatedUser): Promise<InterviewWithScorecard[]> {
    const application = await this.applicationRepository.findById(applicationId);
    if (!application) {
      throw new NotFoundError("Application not found");
    }
    await this.assertCanViewApplication(application, viewer);
    return this.interviewRepository.findByApplicationId(applicationId);
  }

  async updateInterview(
    recruiterId: string,
    interviewId: string,
    input: UpdateInterviewRequestBody,
  ): Promise<InterviewWithScorecard> {
    const interview = await this.requireOwnedInterview(interviewId, recruiterId);
    assertMutable(interview);

    const data: { durationMinutes?: number; meetingUrl?: string | null; notes?: string | null } = {};
    if (input.durationMinutes !== undefined) {
      data.durationMinutes = parseDurationMinutes(input.durationMinutes);
    }
    if (input.meetingUrl !== undefined) {
      data.meetingUrl = asOptionalString(input.meetingUrl) ?? null;
    }
    if (input.notes !== undefined) {
      data.notes = asOptionalString(input.notes) ?? null;
    }

    return this.interviewRepository.update(interviewId, data);
  }

  async rescheduleInterview(
    recruiterId: string,
    interviewId: string,
    input: RescheduleInterviewRequestBody,
  ): Promise<InterviewWithScorecard> {
    const interview = await this.requireOwnedInterview(interviewId, recruiterId);
    assertMutable(interview);

    const scheduledAt = parseScheduledAt(input.scheduledAt);
    assertNotInThePast(scheduledAt);

    const updated = await this.interviewRepository.updateStatus(interviewId, InterviewStatus.RESCHEDULED, { scheduledAt });

    const application = await this.applicationRepository.findById(interview.applicationId);
    if (application) {
      await this.notifyCandidate(
        application,
        NotificationType.INTERVIEW_RESCHEDULED,
        "Interview rescheduled",
        `Your interview for ${application.job.title} has been rescheduled to ${scheduledAt.toISOString()}.`,
      );
    }

    return updated;
  }

  async cancelInterview(recruiterId: string, interviewId: string): Promise<InterviewWithScorecard> {
    const interview = await this.requireOwnedInterview(interviewId, recruiterId);
    assertMutable(interview);
    const updated = await this.interviewRepository.updateStatus(interviewId, InterviewStatus.CANCELLED);

    const application = await this.applicationRepository.findById(interview.applicationId);
    if (application) {
      await this.notifyCandidate(
        application,
        NotificationType.INTERVIEW_CANCELLED,
        "Interview cancelled",
        `Your interview for ${application.job.title} has been cancelled.`,
      );
    }

    return updated;
  }

  async completeInterview(recruiterId: string, interviewId: string): Promise<InterviewWithScorecard> {
    const interview = await this.requireOwnedInterview(interviewId, recruiterId);
    assertMutable(interview);
    return this.interviewRepository.updateStatus(interviewId, InterviewStatus.COMPLETED);
  }

  async submitScorecard(
    recruiterId: string,
    interviewId: string,
    input: SubmitScorecardRequestBody,
  ): Promise<InterviewScorecard> {
    const interview = await this.requireOwnedInterview(interviewId, recruiterId);
    if (interview.status !== InterviewStatus.COMPLETED) {
      throw new ConflictError("Interview must be completed before submitting a scorecard");
    }
    if (interview.scorecard) {
      throw new ConflictError("A scorecard has already been submitted for this interview");
    }

    assertValidScore(input.technicalScore, "technicalScore");
    assertValidScore(input.communicationScore, "communicationScore");
    assertValidScore(input.problemSolvingScore, "problemSolvingScore");
    assertValidRecommendation(input.recommendation);
    const feedback = asOptionalString(input.feedback);

    try {
      return await this.interviewRepository.createScorecard({
        interviewId,
        submittedById: recruiterId,
        technicalScore: input.technicalScore,
        communicationScore: input.communicationScore,
        problemSolvingScore: input.problemSolvingScore,
        recommendation: input.recommendation,
        feedback,
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error, "interviewId")) {
        throw new ConflictError("A scorecard has already been submitted for this interview");
      }
      throw error;
    }
  }

  private async requireInterview(interviewId: string): Promise<InterviewWithScorecard> {
    const interview = await this.interviewRepository.findById(interviewId);
    if (!interview) {
      throw new NotFoundError("Interview not found");
    }
    return interview;
  }

  private async requireOwnedApplication(applicationId: string, recruiterId: string): Promise<ApplicationWithRelations> {
    const application = await this.applicationRepository.findById(applicationId);
    if (!application) {
      throw new NotFoundError("Application not found");
    }
    if (application.job.recruiterId !== recruiterId) {
      throw new ForbiddenError("You do not own the job this application belongs to");
    }
    return application;
  }

  private async requireOwnedInterview(interviewId: string, recruiterId: string): Promise<InterviewWithScorecard> {
    const interview = await this.requireInterview(interviewId);
    await this.requireOwnedApplication(interview.applicationId, recruiterId);
    return interview;
  }

  private async assertCanViewApplication(application: ApplicationWithRelations, viewer: AuthenticatedUser): Promise<void> {
    if (viewer.role === Role.RECRUITER) {
      if (application.job.recruiterId !== viewer.id) {
        throw new NotFoundError("Interview not found");
      }
      return;
    }

    const candidate = await this.candidateRepository.findByUserId(viewer.id);
    if (!candidate || application.candidateId !== candidate.id) {
      throw new NotFoundError("Interview not found");
    }
  }

  private async notifyCandidate(
    application: ApplicationWithRelations,
    type: NotificationType,
    title: string,
    message: string,
  ): Promise<void> {
    const candidate = await this.candidateRepository.findById(application.candidateId);
    if (candidate) {
      await this.notificationService.notifyAsync(candidate.userId, type, title, message);
    }
  }
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}
