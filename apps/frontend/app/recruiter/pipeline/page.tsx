"use client";

import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { LoadingState } from "@/components/layout/loading-state";
import { ErrorState } from "@/components/layout/error-state";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { useJobs } from "@/features/jobs/useJobs";
import { ApiError } from "@/lib/api/error";

export default function PipelinePickerPage() {
  const { data, isLoading, isError, error, refetch } = useJobs();

  return (
    <PageContainer title="Pipeline" description="Pick a job to see its pipeline board.">
      {isLoading && <LoadingState />}
      {isError && (
        <ErrorState
          message={error instanceof ApiError ? error.message : "Could not load jobs."}
          onRetry={() => refetch()}
        />
      )}
      {data && data.length === 0 && <p className="text-sm text-muted-foreground">You haven't created any jobs yet.</p>}
      {data && data.length > 0 && (
        <div className="flex flex-col gap-2">
          {data.map((job) => (
            <Link key={job.id} href={`/recruiter/pipeline/${job.id}`}>
              <Card>
                <CardContent className="flex items-center justify-between">
                  <p className="font-medium">{job.title}</p>
                  <JobStatusBadge status={job.status} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
