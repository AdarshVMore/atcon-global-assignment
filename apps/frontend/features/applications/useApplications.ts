"use client";

import { useQuery } from "@tanstack/react-query";
import { applicationsApi } from "@/lib/api/applications.api";

export function useApplications(jobId?: string) {
  return useQuery({
    queryKey: ["applications", jobId ?? "all"],
    queryFn: () => applicationsApi.list(jobId).then((res) => res.applications),
  });
}

export function useApplication(applicationId: string) {
  return useQuery({
    queryKey: ["applications", "detail", applicationId],
    queryFn: () => applicationsApi.getById(applicationId),
    enabled: !!applicationId,
  });
}
