"use client";

import { useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { LoadingState } from "@/components/layout/loading-state";
import { ErrorState } from "@/components/layout/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { InterviewStatusBadge } from "@/components/interviews/interview-status-badge";
import { InterviewDetailDialog } from "@/components/interviews/interview-detail-dialog";
import { useAllInterviews } from "@/features/interviews/useInterviews";
import type { Interview } from "@/types/interviews";

export default function CandidateInterviewsPage() {
  const { rows, isLoading, isError, refetch } = useAllInterviews();
  const [detailInterview, setDetailInterview] = useState<Interview | null>(null);

  return (
    <PageContainer title="Interviews" description="Interviews scheduled across your applications.">
      {isLoading && <LoadingState />}
      {isError && <ErrorState message="Could not load interviews." onRetry={() => refetch()} />}
      {!isLoading && rows.length === 0 && <p className="text-sm text-muted-foreground">No interviews scheduled yet.</p>}
      <div className="flex flex-col gap-2">
        {rows.map(({ interview, application }) => (
          <button key={interview.id} className="text-left" onClick={() => setDetailInterview(interview)}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium underline decoration-dotted underline-offset-2">{application.job.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(interview.scheduledAt).toLocaleString()} · {interview.durationMinutes} min
                  </p>
                </div>
                <InterviewStatusBadge status={interview.status} />
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <InterviewDetailDialog
        interview={detailInterview}
        open={!!detailInterview}
        onOpenChange={(open) => !open && setDetailInterview(null)}
      />
    </PageContainer>
  );
}
