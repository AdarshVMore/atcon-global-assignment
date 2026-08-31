"use client";

import { useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { LoadingState } from "@/components/layout/loading-state";
import { ErrorState } from "@/components/layout/error-state";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useJobs } from "@/features/jobs/useJobs";
import { ApiError } from "@/lib/api/error";

export default function RecruiterJobsPage() {
  const { data, isLoading, isError, error, refetch } = useJobs();
  const [search, setSearch] = useState("");

  const jobs = (data ?? []).filter((job) => job.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <PageContainer title="Jobs" description="Job postings you own.">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search jobs..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-xs"
        />
        <Button render={<Link href="/recruiter/jobs/new" />}>New job</Button>
      </div>

      {isLoading && <LoadingState />}
      {isError && (
        <ErrorState
          message={error instanceof ApiError ? error.message : "Could not load jobs."}
          onRetry={() => refetch()}
        />
      )}
      {data && jobs.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {data.length === 0 ? "You haven't created any jobs yet." : "No jobs match your search."}
        </p>
      )}
      {jobs.length > 0 && (
        <div className="flex flex-col gap-2">
          {jobs.map((job) => (
            <Link key={job.id} href={`/recruiter/jobs/${job.id}`}>
              <Card>
                <CardContent className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{job.title}</p>
                    <p className="text-xs text-muted-foreground">{job.stages.length} stages</p>
                  </div>
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
