"use client";

import { useQuery } from "@tanstack/react-query";
import { jobsApi } from "@/lib/api/jobs.api";

export function useJobs() {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: () => jobsApi.list().then((res) => res.jobs),
  });
}

export function useJob(jobId: string) {
  return useQuery({
    queryKey: ["jobs", jobId],
    queryFn: () => jobsApi.getById(jobId),
    enabled: !!jobId,
  });
}
