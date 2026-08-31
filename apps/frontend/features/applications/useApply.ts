"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { applicationsApi } from "@/lib/api/applications.api";

export function useApply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, resumeId }: { jobId: string; resumeId: string }) => applicationsApi.apply(jobId, resumeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });
}
