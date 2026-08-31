"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  jobsApi,
  type AddStageInput,
  type CreateJobInput,
  type UpdateJobInput,
  type UpdateStageInput,
} from "@/lib/api/jobs.api";

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateJobInput) => jobsApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] }),
  });
}

export function useUpdateJob(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateJobInput) => jobsApi.update(jobId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId] });
    },
  });
}

export function usePublishJob(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => jobsApi.publish(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId] });
    },
  });
}

export function useCloseJob(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => jobsApi.close(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId] });
    },
  });
}

export function useAddStage(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddStageInput) => jobsApi.addStage(jobId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs", jobId] }),
  });
}

export function useUpdateStage(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stageId, input }: { stageId: string; input: UpdateStageInput }) =>
      jobsApi.updateStage(jobId, stageId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs", jobId] }),
  });
}
