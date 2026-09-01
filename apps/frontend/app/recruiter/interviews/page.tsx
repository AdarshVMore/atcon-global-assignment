"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/page-container";
import { LoadingState } from "@/components/layout/loading-state";
import { ErrorState } from "@/components/layout/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InterviewStatusBadge } from "@/components/interviews/interview-status-badge";
import { InterviewDetailDialog } from "@/components/interviews/interview-detail-dialog";
import { useAllInterviews } from "@/features/interviews/useInterviews";
import { useCancelInterview, useCompleteInterview } from "@/features/interviews/useInterviewMutations";
import { useCandidateNames } from "@/features/candidates/useCandidateNames";
import { ApiError } from "@/lib/api/error";
import type { Interview } from "@/types/interviews";

export default function RecruiterInterviewsPage() {
  const { rows, isLoading, isError, refetch } = useAllInterviews();
  const cancelInterview = useCancelInterview();
  const completeInterview = useCompleteInterview();
  const [detailInterview, setDetailInterview] = useState<Interview | null>(null);
  const names = useCandidateNames(rows.map((row) => row.application));

  return (
    <PageContainer title="Interviews" description="Every interview across the applications you own.">
      {isLoading && <LoadingState />}
      {isError && <ErrorState message="Could not load interviews." onRetry={() => refetch()} />}
      {!isLoading && rows.length === 0 && <p className="text-sm text-muted-foreground">No interviews scheduled yet.</p>}
      <div className="flex flex-col gap-2">
        {rows.map(({ interview, application }) => (
          <Card key={interview.id}>
            <CardContent className="flex items-center justify-between gap-4">
              <button
                type="button"
                className="min-w-0 flex-1 text-left hover:opacity-70"
                onClick={() => setDetailInterview(interview)}
              >
                <p className="truncate font-medium underline decoration-dotted underline-offset-2">
                  {application.job.title} ·{" "}
                  {names.get(application.id) ?? `Candidate ${application.candidateId.slice(0, 8)}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(interview.scheduledAt).toLocaleString()} · {interview.durationMinutes} min
                </p>
              </button>
              <div className="flex shrink-0 items-center gap-2">
                <InterviewStatusBadge status={interview.status} />
                {(interview.status === "SCHEDULED" || interview.status === "RESCHEDULED") && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        completeInterview.mutate(interview.id, {
                          onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not complete."),
                        })
                      }
                    >
                      Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        cancelInterview.mutate(interview.id, {
                          onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not cancel."),
                        })
                      }
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
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
