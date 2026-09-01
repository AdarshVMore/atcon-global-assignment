"use client";

import { PageContainer } from "@/components/layout/page-container";
import { LoadingState } from "@/components/layout/loading-state";
import { ErrorState } from "@/components/layout/error-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { ApplicationsByStageChart } from "@/components/dashboard/applications-by-stage-chart";
import { InterviewsByStatusChart } from "@/components/dashboard/interviews-by-status-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardOverview } from "@/features/dashboard/useDashboardOverview";
import { ApiError } from "@/lib/api/error";

export default function RecruiterOverviewPage() {
  const { data, isLoading, isError, error, refetch } = useDashboardOverview();

  return (
    <PageContainer title="Overview" description="Pipeline metrics across the jobs you own.">
      {isLoading && <LoadingState />}
      {isError && (
        <ErrorState
          message={error instanceof ApiError ? error.message : "Could not load the dashboard."}
          onRetry={() => refetch()}
        />
      )}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Open jobs" value={data.openJobs} />
            <StatCard label="Total applications" value={data.totalApplications} />
            <StatCard
              label="Time to hire"
              value={data.timeToHireDays !== null ? `${data.timeToHireDays}d` : "—"}
              hint="Average days to a hire"
            />
            <StatCard label="Stale applications" value={data.pipelineHealth.staleApplications} hint="Idle 14+ days" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Applications by stage</CardTitle>
              </CardHeader>
              <CardContent>
                <ApplicationsByStageChart stages={data.applicationsByStage} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Interviews by status</CardTitle>
              </CardHeader>
              <CardContent>
                <InterviewsByStatusChart counts={data.interviewCounts} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </PageContainer>
  );
}
