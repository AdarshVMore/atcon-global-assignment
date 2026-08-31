"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { interviewsApi } from "@/lib/api/interviews.api";
import { applicationsApi } from "@/lib/api/applications.api";
import type { Interview } from "@/types/interviews";
import type { Application } from "@/types/applications";

export function useInterviewsForApplication(applicationId: string) {
  return useQuery({
    queryKey: ["interviews", "application", applicationId],
    queryFn: () => interviewsApi.listForApplication(applicationId).then((res) => res.interviews),
    enabled: !!applicationId,
  });
}

export interface InterviewWithApplication {
  interview: Interview;
  application: Application;
}

// The backend has no "list all interviews" endpoint, only per-application
// listing. This aggregates real interviews across every application the
// recruiter owns rather than inventing a list.
export function useAllInterviews() {
  const applicationsQuery = useQuery({
    queryKey: ["applications", "all"],
    queryFn: () => applicationsApi.list().then((res) => res.applications),
  });

  const applications = applicationsQuery.data ?? [];

  const interviewQueries = useQueries({
    queries: applications.map((application) => ({
      queryKey: ["interviews", "application", application.id],
      queryFn: () => interviewsApi.listForApplication(application.id).then((res) => res.interviews),
      enabled: applicationsQuery.isSuccess,
    })),
  });

  const isLoading = applicationsQuery.isLoading || interviewQueries.some((query) => query.isLoading);
  const isError = applicationsQuery.isError || interviewQueries.some((query) => query.isError);

  const rows: InterviewWithApplication[] = applications.flatMap((application, index) => {
    const interviews = interviewQueries[index]?.data ?? [];
    return interviews.map((interview) => ({ interview, application }));
  });

  rows.sort((a, b) => new Date(b.interview.scheduledAt).getTime() - new Date(a.interview.scheduledAt).getTime());

  return {
    rows,
    isLoading,
    isError,
    refetch: () => {
      applicationsQuery.refetch();
      interviewQueries.forEach((query) => query.refetch());
    },
  };
}
