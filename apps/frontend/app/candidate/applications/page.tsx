"use client";

import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { LoadingState } from "@/components/layout/loading-state";
import { ErrorState } from "@/components/layout/error-state";
import { CandidateApplicationsBoard } from "@/components/pipeline/candidate-applications-board";
import { useApplications } from "@/features/applications/useApplications";
import { ApiError } from "@/lib/api/error";

export default function CandidateApplicationsPage() {
  const { data, isLoading, isError, error, refetch } = useApplications();
  const router = useRouter();

  return (
    <PageContainer title="Applications" description="Jobs you've applied to, grouped by stage.">
      {isLoading && <LoadingState />}
      {isError && (
        <ErrorState
          message={error instanceof ApiError ? error.message : "Could not load applications."}
          onRetry={() => refetch()}
        />
      )}
      {data && (
        <CandidateApplicationsBoard
          applications={data}
          onCardClick={(application) => router.push(`/candidate/applications/${application.id}`)}
        />
      )}
    </PageContainer>
  );
}
