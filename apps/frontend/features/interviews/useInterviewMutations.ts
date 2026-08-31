"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  interviewsApi,
  type ScheduleInterviewInput,
  type SubmitScorecardInput,
} from "@/lib/api/interviews.api";

function useInvalidateInterviews() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["interviews"] });
    queryClient.invalidateQueries({ queryKey: ["applications"] });
  };
}

export function useScheduleInterview(applicationId: string) {
  const invalidate = useInvalidateInterviews();
  return useMutation({
    mutationFn: (input: ScheduleInterviewInput) => interviewsApi.schedule(applicationId, input),
    onSuccess: invalidate,
  });
}

export function useRescheduleInterview() {
  const invalidate = useInvalidateInterviews();
  return useMutation({
    mutationFn: ({ interviewId, scheduledAt }: { interviewId: string; scheduledAt: string }) =>
      interviewsApi.reschedule(interviewId, scheduledAt),
    onSuccess: invalidate,
  });
}

export function useCancelInterview() {
  const invalidate = useInvalidateInterviews();
  return useMutation({
    mutationFn: (interviewId: string) => interviewsApi.cancel(interviewId),
    onSuccess: invalidate,
  });
}

export function useCompleteInterview() {
  const invalidate = useInvalidateInterviews();
  return useMutation({
    mutationFn: (interviewId: string) => interviewsApi.complete(interviewId),
    onSuccess: invalidate,
  });
}

export function useSubmitScorecard() {
  const invalidate = useInvalidateInterviews();
  return useMutation({
    mutationFn: ({ interviewId, input }: { interviewId: string; input: SubmitScorecardInput }) =>
      interviewsApi.submitScorecard(interviewId, input),
    onSuccess: invalidate,
  });
}
