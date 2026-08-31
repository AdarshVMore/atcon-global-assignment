"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/page-container";
import { LoadingState } from "@/components/layout/loading-state";
import { ErrorState } from "@/components/layout/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useJob } from "@/features/jobs/useJobs";
import { useResumes } from "@/features/candidates/useCandidateProfile";
import { useApply } from "@/features/applications/useApply";
import { ApiError } from "@/lib/api/error";

export default function CandidateJobDetailPage({ params }: PageProps<"/candidate/jobs/[jobId]">) {
  const { jobId } = use(params);
  const router = useRouter();
  const { data: job, isLoading, isError, error, refetch } = useJob(jobId);
  const { data: resumes } = useResumes();
  const apply = useApply();
  const [resumeId, setResumeId] = useState("");

  function handleApply() {
    if (!resumeId) {
      toast.error("Pick a resume first");
      return;
    }
    apply.mutate(
      { jobId, resumeId },
      {
        onSuccess: () => {
          toast.success("Application submitted");
          router.push("/candidate/applications");
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not submit application."),
      },
    );
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
    <PageContainer title={job.title}>
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

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Apply</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {(resumes ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You need a resume on file before applying.{" "}
              <Link href="/candidate/profile" className="underline underline-offset-4">
                Upload one
              </Link>
              .
            </p>
          ) : (
            <>
              <Select value={resumeId} onValueChange={(value) => setResumeId(value ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a resume" />
                </SelectTrigger>
                <SelectContent>
                  {(resumes ?? []).map((resume) => (
                    <SelectItem key={resume.id} value={resume.id}>
                      {resume.originalFileName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleApply} disabled={apply.isPending}>
                {apply.isPending ? "Submitting..." : "Submit application"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
