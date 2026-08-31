"use client";

import { use } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { LoadingState } from "@/components/layout/loading-state";
import { ErrorState } from "@/components/layout/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useJob } from "@/features/jobs/useJobs";
import { useApplications } from "@/features/applications/useApplications";
import { useMoveStage } from "@/features/applications/useMoveStage";
import { ApiError } from "@/lib/api/error";
import type { JobStage } from "@/types/jobs";
import { toast } from "sonner";

function validTargetStages(currentStage: JobStage, stages: JobStage[]): JobStage[] {
  if (currentStage.isTerminal) return [];
  const next = stages.find((stage) => stage.order === currentStage.order + 1);
  const terminals = stages.filter((stage) => stage.isTerminal && stage.id !== currentStage.id);
  const targets = [next, ...terminals].filter((stage): stage is JobStage => !!stage);
  return Array.from(new Map(targets.map((stage) => [stage.id, stage])).values());
}

export default function PipelineBoardPage({ params }: PageProps<"/recruiter/pipeline/[jobId]">) {
  const { jobId } = use(params);
  const { data: job, isLoading: jobLoading, isError: jobError, error: jobErr, refetch: refetchJob } = useJob(jobId);
  const { data: applications, isLoading: appsLoading, isError: appsError, error: appsErr, refetch: refetchApps } =
    useApplications(jobId);
  const moveStage = useMoveStage();

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
            jobErr instanceof ApiError ? jobErr.message : appsErr instanceof ApiError ? appsErr.message : "Could not load the pipeline."
          }
          onRetry={() => {
            refetchJob();
            refetchApps();
          }}
        />
      </PageContainer>
    );
  }

  const stages = [...job.stages].sort((a, b) => a.order - b.order);
  const apps = applications ?? [];

  return (
    <PageContainer title={job.title} description="Move applications forward or to a terminal stage.">
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageApplications = apps.filter((application) => application.currentStageId === stage.id);
          return (
            <div key={stage.id} className="flex w-72 shrink-0 flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-sm font-medium">{stage.name}</p>
                <span className="text-xs text-muted-foreground">{stageApplications.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {stageApplications.length === 0 && (
                  <p className="px-1 text-xs text-muted-foreground">No applications.</p>
                )}
                {stageApplications.map((application) => {
                  const targets = validTargetStages(stage, stages);
                  return (
                    <Card key={application.id}>
                      <CardContent className="flex flex-col gap-2">
                        <p className="text-sm font-medium">Candidate {application.candidateId.slice(0, 8)}</p>
                        {application.rankingScore !== null && (
                          <p className="text-xs text-muted-foreground">Score: {Math.round(application.rankingScore)}</p>
                        )}
                        {targets.length > 0 && (
                          <Select
                            value=""
                            onValueChange={(stageId) => {
                              if (!stageId) return;
                              moveStage.mutate(
                                { applicationId: application.id, stageId },
                                {
                                  onError: (err) =>
                                    toast.error(err instanceof ApiError ? err.message : "Could not move stage."),
                                },
                              );
                            }}
                          >
                            <SelectTrigger size="sm" className="w-full">
                              <SelectValue placeholder="Move to..." />
                            </SelectTrigger>
                            <SelectContent>
                              {targets.map((target) => (
                                <SelectItem key={target.id} value={target.id}>
                                  {target.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </PageContainer>
  );
}
