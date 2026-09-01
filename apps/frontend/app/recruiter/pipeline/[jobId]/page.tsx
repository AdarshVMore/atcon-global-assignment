"use client";

import { use, useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { LoadingState } from "@/components/layout/loading-state";
import { ErrorState } from "@/components/layout/error-state";
import { KanbanBoard } from "@/components/pipeline/kanban-board";
import { CandidateDetailSheet } from "@/components/candidates/candidate-detail-sheet";
import { useJob } from "@/features/jobs/useJobs";
import { useApplications } from "@/features/applications/useApplications";
import { ApiError } from "@/lib/api/error";
import type { Application } from "@/types/applications";

export default function PipelineBoardPage({ params }: PageProps<"/recruiter/pipeline/[jobId]">) {
  const { jobId } = use(params);
  const { data: job, isLoading: jobLoading, isError: jobError, error: jobErr, refetch: refetchJob } = useJob(jobId);
  const {
    data: applications,
    isLoading: appsLoading,
    isError: appsError,
    error: appsErr,
    refetch: refetchApps,
  } = useApplications(jobId);
  const [selected, setSelected] = useState<Application | null>(null);

  if (jobLoading || appsLoading) {
    return (
      <PageContainer title="Pipeline">
        <LoadingState />
      </PageContainer>
    );
  }

  if (jobError || appsError || !job) {
    return (
      <PageContainer title="Pipeline">
        <ErrorState
          message={
            jobErr instanceof ApiError
              ? jobErr.message
              : appsErr instanceof ApiError
                ? appsErr.message
                : "Could not load the pipeline."
          }
          onRetry={() => {
            refetchJob();
            refetchApps();
          }}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer title={job.title} description="Drag a card to move it forward, or to a terminal stage.">
      <KanbanBoard
        stages={job.stages}
        applications={applications ?? []}
        queryKey={["applications", jobId]}
        onCardClick={setSelected}
      />

      <CandidateDetailSheet application={selected} open={!!selected} onOpenChange={(open) => !open && setSelected(null)} />
    </PageContainer>
  );
}
