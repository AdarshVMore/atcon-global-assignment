"use client";

import { useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { LoadingState } from "@/components/layout/loading-state";
import { ErrorState } from "@/components/layout/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useJobs } from "@/features/jobs/useJobs";
import { ApiError } from "@/lib/api/error";

export default function CandidateJobsPage() {
  const { data, isLoading, isError, error, refetch } = useJobs();
  const [search, setSearch] = useState("");

  const jobs = (data ?? []).filter((job) => job.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <PageContainer title="Jobs" description="Open roles you can apply to.">
      <Input
        placeholder="Search jobs..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="max-w-xs"
      />
      {isLoading && <LoadingState />}
      {isError && (
        <ErrorState
          message={error instanceof ApiError ? error.message : "Could not load jobs."}
          onRetry={() => refetch()}
        />
      )}
      {data && jobs.length === 0 && <p className="text-sm text-muted-foreground">No open roles right now.</p>}
      <div className="flex flex-col gap-2">
        {jobs.map((job) => (
          <Link key={job.id} href={`/candidate/jobs/${job.id}`}>
            <Card>
              <CardContent>
                <p className="font-medium">{job.title}</p>
                <p className="line-clamp-2 text-sm text-muted-foreground">{job.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
