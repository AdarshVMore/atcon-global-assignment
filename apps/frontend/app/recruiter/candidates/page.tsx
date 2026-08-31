"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { LoadingState } from "@/components/layout/loading-state";
import { ErrorState } from "@/components/layout/error-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApplications } from "@/features/applications/useApplications";
import { ApplicationInterviewsPanel } from "@/components/interviews/application-interviews-panel";
import { ApiError } from "@/lib/api/error";
import type { Application } from "@/types/applications";

export default function RecruiterCandidatesPage() {
  const jobId = useSearchParams().get("jobId") ?? undefined;
  const { data, isLoading, isError, error, refetch } = useApplications(jobId);
  const [selected, setSelected] = useState<Application | null>(null);

  return (
    <PageContainer
      title="Candidates"
      description="Applications across your jobs. Candidate profiles aren't exposed by the API yet, so this shows what the backend actually returns — ranking score and pipeline stage per application."
    >
      {isLoading && <LoadingState />}
      {isError && (
        <ErrorState
          message={error instanceof ApiError ? error.message : "Could not load applications."}
          onRetry={() => refetch()}
        />
      )}
      {data && data.length === 0 && <p className="text-sm text-muted-foreground">No applications yet.</p>}
      {data && data.length > 0 && (
        <div className="flex flex-col gap-2">
          {data.map((application) => (
            <button key={application.id} className="text-left" onClick={() => setSelected(application)}>
              <Card>
                <CardContent className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">Candidate {application.candidateId.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">
                      {application.job.title} · applied {new Date(application.appliedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {application.rankingScore !== null && (
                      <span className="text-sm text-muted-foreground">
                        Score: {Math.round(application.rankingScore)}
                      </span>
                    )}
                    <Badge variant="outline">{application.currentStage.name}</Badge>
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Candidate {selected?.candidateId.slice(0, 8)}</DialogTitle>
            <DialogDescription>{selected?.job.title}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="flex flex-col gap-3 text-sm">
              <div>
                <p className="font-medium">Current stage</p>
                <p className="text-muted-foreground">{selected.currentStage.name}</p>
              </div>
              {selected.rankingScore !== null && (
                <div>
                  <p className="font-medium">Ranking score</p>
                  <p className="text-muted-foreground">{Math.round(selected.rankingScore)}</p>
                </div>
              )}
              <div>
                <p className="font-medium">Stage history</p>
                <ul className="mt-1 flex flex-col gap-1 text-muted-foreground">
                  {selected.stageHistory.map((entry) => (
                    <li key={entry.id}>
                      {new Date(entry.changedAt).toLocaleString()} — {entry.reason ?? "Stage updated"}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 font-medium">Interviews</p>
                <ApplicationInterviewsPanel applicationId={selected.id} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
