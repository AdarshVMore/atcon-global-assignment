import { prisma, type Interview, type InterviewScorecard, type InterviewStatus, type ScorecardRecommendation } from "@atcon/database";

export type InterviewWithScorecard = Interview & { scorecard: InterviewScorecard | null };

export interface CreateInterviewInput {
  applicationId: string;
  interviewerId: string | null;
  scheduledAt: Date;
  durationMinutes: number;
  meetingUrl?: string;
  notes?: string;
}

export interface UpdateInterviewInput {
  durationMinutes?: number;
  meetingUrl?: string | null;
  notes?: string | null;
}

export interface CreateScorecardInput {
  interviewId: string;
  submittedById: string;
  technicalScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  recommendation: ScorecardRecommendation;
  feedback?: string;
}

const withScorecard = { scorecard: true };

export class InterviewRepository {
  create(input: CreateInterviewInput): Promise<InterviewWithScorecard> {
    return prisma.interview.create({
      data: {
        applicationId: input.applicationId,
        interviewerId: input.interviewerId,
        scheduledAt: input.scheduledAt,
        durationMinutes: input.durationMinutes,
        meetingUrl: input.meetingUrl,
        notes: input.notes,
      },
      include: withScorecard,
    });
  }

  findById(id: string): Promise<InterviewWithScorecard | null> {
    return prisma.interview.findUnique({ where: { id }, include: withScorecard });
  }

  findByApplicationId(applicationId: string): Promise<InterviewWithScorecard[]> {
    return prisma.interview.findMany({
      where: { applicationId },
      include: withScorecard,
      orderBy: { scheduledAt: "asc" },
    });
  }

  update(id: string, data: UpdateInterviewInput): Promise<InterviewWithScorecard> {
    return prisma.interview.update({ where: { id }, data, include: withScorecard });
  }

  updateStatus(id: string, status: InterviewStatus, extra: { scheduledAt?: Date } = {}): Promise<InterviewWithScorecard> {
    return prisma.interview.update({ where: { id }, data: { status, ...extra }, include: withScorecard });
  }

  createScorecard(input: CreateScorecardInput): Promise<InterviewScorecard> {
    return prisma.interviewScorecard.create({ data: input });
  }
}
