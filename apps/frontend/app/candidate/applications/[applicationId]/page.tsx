"use client";

import { use, useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { LoadingState } from "@/components/layout/loading-state";
import { ErrorState } from "@/components/layout/error-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InterviewStatusBadge } from "@/components/interviews/interview-status-badge";
import { InterviewDetailDialog } from "@/components/interviews/interview-detail-dialog";
import { useApplication } from "@/features/applications/useApplications";
import { useInterviewsForApplication } from "@/features/interviews/useInterviews";
import { ApiError } from "@/lib/api/error";
import type { Interview } from "@/types/interviews";

export default function CandidateApplicationDetailPage({
  params,
}: PageProps<"/candidate/applications/[applicationId]">) {
  const { applicationId } = use(params);
  const { data: application, isLoading, isError, error, refetch } = useApplication(applicationId);
  const { data: interviews } = useInterviewsForApplication(applicationId);
  const [detailInterview, setDetailInterview] = useState<Interview | null>(null);

  if (isLoading) {
    return (
      <PageContainer title="Application">
        <LoadingState />
      </PageContainer>
    );
  }

  if (isError || !application) {
    return (
      <PageContainer title="Application">
        <ErrorState
          message={error instanceof ApiError ? error.message : "Could not load this application."}
          onRetry={() => refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer title={application.job.title}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Current stage</span>
        <Badge variant="outline">{application.currentStage.name}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stage history</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
            {application.stageHistory.map((entry) => (
              <li key={entry.id}>
                {new Date(entry.changedAt).toLocaleString()} — {entry.reason ?? "Stage updated"}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Interviews</CardTitle>
        </CardHeader>
        <CardContent>
          {(interviews ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No interviews scheduled yet.</p>
          )}
          <div className="flex flex-col gap-2">
            {(interviews ?? []).map((interview) => (
              <button
                key={interview.id}
                className="flex items-center justify-between rounded-md border p-2 text-left text-sm hover:bg-muted/40"
                onClick={() => setDetailInterview(interview)}
              >
                <div>
                  <p className="underline decoration-dotted underline-offset-2">
                    {new Date(interview.scheduledAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">{interview.durationMinutes} minutes</p>
                </div>
                <InterviewStatusBadge status={interview.status} />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <InterviewDetailDialog
        interview={detailInterview}
        open={!!detailInterview}
        onOpenChange={(open) => !open && setDetailInterview(null)}
      />
    </PageContainer>
  );
}
