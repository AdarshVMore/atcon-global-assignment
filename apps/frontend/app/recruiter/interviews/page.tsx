"use client";

import { toast } from "sonner";
import { PageContainer } from "@/components/layout/page-container";
import { LoadingState } from "@/components/layout/loading-state";
import { ErrorState } from "@/components/layout/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InterviewStatusBadge } from "@/components/interviews/interview-status-badge";
import { useAllInterviews } from "@/features/interviews/useInterviews";
import { useCancelInterview, useCompleteInterview } from "@/features/interviews/useInterviewMutations";
import { ApiError } from "@/lib/api/error";

export default function RecruiterInterviewsPage() {
  const { rows, isLoading, isError, refetch } = useAllInterviews();
  const cancelInterview = useCancelInterview();
  const completeInterview = useCompleteInterview();

  return (
    <PageContainer title="Interviews" description="Every interview across the applications you own.">
      {isLoading && <LoadingState />}
      {isError && <ErrorState message="Could not load interviews." onRetry={() => refetch()} />}
      {!isLoading && rows.length === 0 && <p className="text-sm text-muted-foreground">No interviews scheduled yet.</p>}
      <div className="flex flex-col gap-2">
        {rows.map(({ interview, application }) => (
          <Card key={interview.id}>
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">
                  {application.job.title} · Candidate {application.candidateId.slice(0, 8)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(interview.scheduledAt).toLocaleString()} · {interview.durationMinutes} min
                </p>
              </div>
              <div className="flex items-center gap-2">
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
    </PageContainer>
  );
}
