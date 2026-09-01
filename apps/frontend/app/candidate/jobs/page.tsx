"use client";

import { useMemo, useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { LoadingState } from "@/components/layout/loading-state";
import { ErrorState } from "@/components/layout/error-state";
import { JobCard } from "@/components/jobs/job-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useJobs } from "@/features/jobs/useJobs";
import { useResumes } from "@/features/candidates/useCandidateProfile";
import { mostRecentParsedResume, scoreJobRelevance } from "@/lib/jobRelevance";
import { ApiError } from "@/lib/api/error";

type ViewMode = "relevant" | "all";

export default function CandidateJobsPage() {
  const { data, isLoading, isError, error, refetch } = useJobs();
  const { data: resumes } = useResumes();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("relevant");

  const resume = mostRecentParsedResume(resumes ?? []);

  const scored = useMemo(
    () => (data ?? []).map((job) => ({ job, relevance: scoreJobRelevance(job, resume) })),
    [data, resume],
  );

  const filtered = scored.filter(({ job }) => job.title.toLowerCase().includes(search.toLowerCase()));
  const jobs =
    view === "relevant" && resume
      ? [...filtered].sort((a, b) => b.relevance - a.relevance)
      : [...filtered].sort((a, b) => new Date(b.job.createdAt).getTime() - new Date(a.job.createdAt).getTime());

  return (
    <PageContainer title="Jobs" description="Open roles you can apply to.">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          placeholder="Search jobs..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-xs"
        />
        <div className="flex items-center gap-1 rounded-lg border p-0.5">
          <Button
            size="sm"
            variant={view === "relevant" ? "secondary" : "ghost"}
            onClick={() => setView("relevant")}
            disabled={!resume}
          >
            Relevant to you
          </Button>
          <Button size="sm" variant={view === "all" ? "secondary" : "ghost"} onClick={() => setView("all")}>
            All jobs
          </Button>
        </div>
      </div>

      {!resume && (
        <p className="text-xs text-muted-foreground">
          Upload and parse a resume on your profile to see jobs sorted by relevance.
        </p>
      )}

      {isLoading && <LoadingState />}
      {isError && (
        <ErrorState
          message={error instanceof ApiError ? error.message : "Could not load jobs."}
          onRetry={() => refetch()}
        />
      )}
      {data && jobs.length === 0 && <p className="text-sm text-muted-foreground">No open roles right now.</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {jobs.map(({ job, relevance }) => (
          <JobCard
            key={job.id}
            href={`/candidate/jobs/${job.id}`}
            title={job.title}
            description={job.description}
            relevance={view === "relevant" ? relevance : undefined}
          />
        ))}
      </div>
    </PageContainer>
  );
}
