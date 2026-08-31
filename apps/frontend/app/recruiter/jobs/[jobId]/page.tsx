"use client";

import { use } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { LoadingState } from "@/components/layout/loading-state";
import { ErrorState } from "@/components/layout/error-state";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useJob } from "@/features/jobs/useJobs";
import { useCloseJob, usePublishJob } from "@/features/jobs/useJobMutations";
import { ApiError } from "@/lib/api/error";
import { toast } from "sonner";

export default function JobDetailPage({ params }: PageProps<"/recruiter/jobs/[jobId]">) {
  const { jobId } = use(params);
  const { data: job, isLoading, isError, error, refetch } = useJob(jobId);
  const publishJob = usePublishJob(jobId);
  const closeJob = useCloseJob(jobId);

  function handlePublish() {
    publishJob.mutate(undefined, {
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not publish job."),
    });
  }

  function handleClose() {
    closeJob.mutate(undefined, {
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not close job."),
    });
  }

  if (isLoading) {
    return (
      <PageContainer title="Job">
        <LoadingState />
      </PageContainer>
    );
  }

  if (isError || !job) {
    return (
      <PageContainer title="Job">
        <ErrorState
          message={error instanceof ApiError ? error.message : "Could not load this job."}
          onRetry={() => refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
            <JobStatusBadge status={job.status} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href={`/recruiter/jobs/${job.id}/edit`} />} disabled={job.status === "CLOSED"}>
            Edit
          </Button>
          {job.status === "DRAFT" && (
            <Button onClick={handlePublish} disabled={publishJob.isPending}>
              {publishJob.isPending ? "Publishing..." : "Publish"}
            </Button>
          )}
          {job.status !== "CLOSED" && (
            <Button variant="outline" onClick={handleClose} disabled={closeJob.isPending}>
              {closeJob.isPending ? "Closing..." : "Close"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{job.description}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{job.requirements}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline stages</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-wrap gap-2">
            {[...job.stages]
              .sort((a, b) => a.order - b.order)
              .map((stage) => (
                <li key={stage.id} className="rounded-md border px-2.5 py-1 text-sm">
                  {stage.name}
                  {stage.isTerminal && <span className="ml-1 text-xs text-muted-foreground">(terminal)</span>}
                </li>
              ))}
          </ol>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" render={<Link href={`/recruiter/candidates?jobId=${job.id}`} />}>
          View applications
        </Button>
        <Button variant="outline" render={<Link href={`/recruiter/pipeline/${job.id}`} />}>
          View pipeline
        </Button>
      </div>
    </PageContainer>
  );
}
