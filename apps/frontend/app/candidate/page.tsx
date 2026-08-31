"use client";

import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { LoadingState } from "@/components/layout/loading-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { useApplications } from "@/features/applications/useApplications";
import { useAllInterviews } from "@/features/interviews/useInterviews";

export default function CandidateOverviewPage() {
  const { data: applications, isLoading } = useApplications();
  const { rows: interviews, isLoading: interviewsLoading } = useAllInterviews();

  const upcoming = interviews.filter(
    ({ interview }) => interview.status === "SCHEDULED" || interview.status === "RESCHEDULED",
  );

  return (
    <PageContainer title="Overview" description="Your applications at a glance.">
      {isLoading || interviewsLoading ? (
        <LoadingState />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <StatCard label="Applications" value={applications?.length ?? 0} />
            <StatCard label="Upcoming interviews" value={upcoming.length} />
            <StatCard
              label="Active"
              value={(applications ?? []).filter((a) => !a.currentStage.isTerminal).length}
            />
          </div>
          <Button render={<Link href="/candidate/jobs" />} className="self-start">
            Browse open roles
          </Button>
        </>
      )}
    </PageContainer>
  );
}
