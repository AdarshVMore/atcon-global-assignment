"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { LoadingState } from "@/components/layout/loading-state";
import { ErrorState } from "@/components/layout/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useJob } from "@/features/jobs/useJobs";
import { useUpdateJob } from "@/features/jobs/useJobMutations";
import { ApiError } from "@/lib/api/error";
import type { Job } from "@/types/jobs";

export default function EditJobPage({ params }: PageProps<"/recruiter/jobs/[jobId]/edit">) {
  const { jobId } = use(params);
  const { data: job, isLoading, isError, error, refetch } = useJob(jobId);

  if (isLoading) {
    return (
      <PageContainer title="Edit job">
        <LoadingState />
      </PageContainer>
    );
  }

  if (isError || !job) {
    return (
      <PageContainer title="Edit job">
        <ErrorState
          message={error instanceof ApiError ? error.message : "Could not load this job."}
          onRetry={() => refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Edit job">
      <EditJobForm job={job} />
    </PageContainer>
  );
}

function EditJobForm({ job }: { job: Job }) {
  const router = useRouter();
  const updateJob = useUpdateJob(job.id);

  const [title, setTitle] = useState(job.title);
  const [description, setDescription] = useState(job.description);
  const [requirements, setRequirements] = useState(job.requirements);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    updateJob.mutate(
      { title, description, requirements },
      { onSuccess: () => router.push(`/recruiter/jobs/${job.id}`) },
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" required value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              required
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="requirements">Requirements</Label>
            <Textarea
              id="requirements"
              required
              rows={4}
              value={requirements}
              onChange={(event) => setRequirements(event.target.value)}
            />
          </div>
          {updateJob.isError && (
            <ErrorState
              message={updateJob.error instanceof ApiError ? updateJob.error.message : "Could not update job."}
            />
          )}
          <Button type="submit" disabled={updateJob.isPending}>
            {updateJob.isPending ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
