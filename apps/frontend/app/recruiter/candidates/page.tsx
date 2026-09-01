"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { LoadingState } from "@/components/layout/loading-state";
import { ErrorState } from "@/components/layout/error-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { KanbanBoard } from "@/components/pipeline/kanban-board";
import { CandidateDetailSheet } from "@/components/candidates/candidate-detail-sheet";
import { useApplications } from "@/features/applications/useApplications";
import { useCandidateNames } from "@/features/candidates/useCandidateNames";
import { useJob } from "@/features/jobs/useJobs";
import { ApiError } from "@/lib/api/error";
import type { Application } from "@/types/applications";

export default function RecruiterCandidatesPage() {
  const jobId = useSearchParams().get("jobId") ?? undefined;

  return jobId ? <ScopedCandidatesBoard jobId={jobId} /> : <AllCandidatesList />;
}

function ScopedCandidatesBoard({ jobId }: { jobId: string }) {
  const { data: job, isLoading: jobLoading, isError: jobError, refetch: refetchJob } = useJob(jobId);
  const { data: applications, isLoading: appsLoading, isError: appsError, refetch: refetchApps } = useApplications(jobId);
  const [selected, setSelected] = useState<Application | null>(null);

  return (
    <PageContainer title={job ? `Candidates — ${job.title}` : "Candidates"} description="Drag a card to move it between stages.">
      {(jobLoading || appsLoading) && <LoadingState />}
      {(jobError || appsError) && (
        <ErrorState
          message="Could not load this job's candidates."
          onRetry={() => {
            refetchJob();
            refetchApps();
          }}
        />
      )}
      {job && (
        <KanbanBoard
          stages={job.stages}
          applications={applications ?? []}
          queryKey={["applications", jobId]}
          onCardClick={setSelected}
        />
      )}
      <CandidateDetailSheet application={selected} open={!!selected} onOpenChange={(open) => !open && setSelected(null)} />
    </PageContainer>
  );
}

function AllCandidatesList() {
  const { data, isLoading, isError, error, refetch } = useApplications();
  const [selected, setSelected] = useState<Application | null>(null);
  const names = useCandidateNames(data ?? []);

  return (
    <PageContainer
      title="Candidates"
      description="Applications across all your jobs. Pick a job from Pipeline to see its board instead."
    >
      {isLoading && <LoadingState />}
      {isError && (
        <ErrorState
          message={error instanceof ApiError ? error.message : "Could not load applications."}
          onRetry={() => refetch()}
        />
      )}
      {data && data.length === 0 && <p className="text-sm text-muted-foreground">No applications yet.</p>}
      {data && data.length > 0 && (
        <div className="flex flex-col gap-2">
          {data.map((application) => (
            <button key={application.id} className="text-left" onClick={() => setSelected(application)}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">
                      {names.get(application.id) ?? `Candidate ${application.candidateId.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {application.job.title} · applied {new Date(application.appliedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {application.rankingScore !== null && (
                      <span className="text-sm text-muted-foreground">
                        Score: {Math.round(application.rankingScore)}
                      </span>
                    )}
                    <Badge variant="outline">{application.currentStage.name}</Badge>
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      <CandidateDetailSheet application={selected} open={!!selected} onOpenChange={(open) => !open && setSelected(null)} />
    </PageContainer>
  );
}
