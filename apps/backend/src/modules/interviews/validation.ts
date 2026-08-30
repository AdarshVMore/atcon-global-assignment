import { ScorecardRecommendation } from "@atcon/database";
import { BadRequestError } from "../../shared/errors/HttpError.ts";

const MIN_DURATION_MINUTES = 15;
const MAX_DURATION_MINUTES = 480;
const MIN_SCORE = 1;
const MAX_SCORE = 5;

const VALID_RECOMMENDATIONS = [
  ScorecardRecommendation.STRONG_YES,
  ScorecardRecommendation.YES,
  ScorecardRecommendation.NO,
  ScorecardRecommendation.STRONG_NO,
];

export function parseScheduledAt(value: unknown): Date {
  if (typeof value !== "string") {
    throw new BadRequestError("scheduledAt is required and must be an ISO date string");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestError("scheduledAt must be a valid date");
  }
  return date;
}

export function assertNotInThePast(date: Date): void {
  if (date.getTime() < Date.now()) {
    throw new BadRequestError("scheduledAt must be in the future");
  }
}

export function parseDurationMinutes(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < MIN_DURATION_MINUTES || value > MAX_DURATION_MINUTES) {
    throw new BadRequestError(`durationMinutes must be an integer between ${MIN_DURATION_MINUTES} and ${MAX_DURATION_MINUTES}`);
  }
  return value;
}

export function assertValidScore(value: unknown, fieldName: string): asserts value is number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < MIN_SCORE || value > MAX_SCORE) {
    throw new BadRequestError(`${fieldName} must be an integer between ${MIN_SCORE} and ${MAX_SCORE}`);
  }
}

export function assertValidRecommendation(value: unknown): asserts value is ScorecardRecommendation {
  if (typeof value !== "string" || !VALID_RECOMMENDATIONS.includes(value as ScorecardRecommendation)) {
    throw new BadRequestError("recommendation must be one of STRONG_YES, YES, NO, STRONG_NO");
  }
}
