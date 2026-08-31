"use client";

import { PageContainer } from "@/components/layout/page-container";
import { LoadingState } from "@/components/layout/loading-state";
import { ErrorState } from "@/components/layout/error-state";
import { StatCard } from "@/components/dashboard/stat-card";
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
                {data.applicationsByStage.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No applications yet.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {data.applicationsByStage.map((stage) => (
                      <li key={stage.stageId} className="flex items-center justify-between text-sm">
                        <span>{stage.stageName}</span>
                        <span className="font-medium">{stage.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Interviews by status</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(data.interviewCounts).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No interviews scheduled yet.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {Object.entries(data.interviewCounts).map(([status, count]) => (
                      <li key={status} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{status.toLowerCase()}</span>
                        <span className="font-medium">{count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </PageContainer>
  );
}
