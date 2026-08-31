"use client";

import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { LoadingState } from "@/components/layout/loading-state";
import { ErrorState } from "@/components/layout/error-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useApplications } from "@/features/applications/useApplications";
import { ApiError } from "@/lib/api/error";

export default function CandidateApplicationsPage() {
  const { data, isLoading, isError, error, refetch } = useApplications();

  return (
    <PageContainer title="Applications" description="Jobs you've applied to.">
      {isLoading && <LoadingState />}
      {isError && (
        <ErrorState
          message={error instanceof ApiError ? error.message : "Could not load applications."}
          onRetry={() => refetch()}
        />
      )}
      {data && data.length === 0 && <p className="text-sm text-muted-foreground">You haven&apos;t applied to anything yet.</p>}
      <div className="flex flex-col gap-2">
        {(data ?? []).map((application) => (
          <Link key={application.id} href={`/candidate/applications/${application.id}`}>
            <Card>
              <CardContent className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{application.job.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Applied {new Date(application.appliedAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="outline">{application.currentStage.name}</Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
