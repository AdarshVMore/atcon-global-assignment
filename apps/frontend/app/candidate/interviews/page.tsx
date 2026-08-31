"use client";

import { PageContainer } from "@/components/layout/page-container";
import { LoadingState } from "@/components/layout/loading-state";
import { ErrorState } from "@/components/layout/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { InterviewStatusBadge } from "@/components/interviews/interview-status-badge";
import { useAllInterviews } from "@/features/interviews/useInterviews";

export default function CandidateInterviewsPage() {
  const { rows, isLoading, isError, refetch } = useAllInterviews();

  return (
    <PageContainer title="Interviews" description="Interviews scheduled across your applications.">
      {isLoading && <LoadingState />}
      {isError && <ErrorState message="Could not load interviews." onRetry={() => refetch()} />}
      {!isLoading && rows.length === 0 && <p className="text-sm text-muted-foreground">No interviews scheduled yet.</p>}
      <div className="flex flex-col gap-2">
        {rows.map(({ interview, application }) => (
          <Card key={interview.id}>
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">{application.job.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(interview.scheduledAt).toLocaleString()} · {interview.durationMinutes} min
                </p>
              </div>
              <InterviewStatusBadge status={interview.status} />
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
