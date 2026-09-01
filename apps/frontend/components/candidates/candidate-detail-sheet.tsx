"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/layout/loading-state";
import { ErrorState } from "@/components/layout/error-state";
import { CandidateProfileView } from "@/components/candidates/candidate-profile-view";
import { ResumeViewerDialog } from "@/components/candidates/resume-viewer-dialog";
import { ApplicationInterviewsPanel } from "@/components/interviews/application-interviews-panel";
import { useCandidateForApplication } from "@/features/candidates/useCandidateProfile";
import { ApiError } from "@/lib/api/error";
import type { Application } from "@/types/applications";

interface CandidateDetailSheetProps {
  application: Application | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CandidateDetailSheet({ application, open, onOpenChange }: CandidateDetailSheetProps) {
  const { data: candidate, isLoading, isError, error } = useCandidateForApplication(
    open ? (application?.id ?? null) : null,
  );
  const [viewingResume, setViewingResume] = useState(false);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{candidate?.user.name ?? "Candidate"}</SheetTitle>
            <SheetDescription>{application?.job.title}</SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-5 px-4 pb-6">
            {isLoading && <LoadingState rows={4} />}
            {isError && (
              <ErrorState message={error instanceof ApiError ? error.message : "Could not load this candidate."} />
            )}

            {application && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Stage</span>
                <Badge variant="outline">{application.currentStage.name}</Badge>
                {application.rankingScore !== null && (
                  <Badge variant="secondary" className="font-mono tabular-nums">
                    score {Math.round(application.rankingScore)}
                  </Badge>
                )}
              </div>
            )}

            {candidate && (
              <CandidateProfileView
                name={candidate.user.name}
                email={candidate.user.email}
                phone={candidate.phone}
                resume={candidate.resume}
              />
            )}

            {candidate?.resume && (
              <div>
                <p className="mb-2 text-sm font-medium">Resume</p>
                <div className="flex items-center justify-between gap-2 rounded-lg border p-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{candidate.resume.originalFileName}</p>
                    <p className="text-xs text-muted-foreground">
                      Applied with this resume, uploaded {new Date(candidate.resume.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setViewingResume(true)}>
                    View
                  </Button>
                </div>
              </div>
            )}

            {application && application.stageHistory.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">Stage history</p>
                <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                  {application.stageHistory.map((entry) => (
                    <li key={entry.id}>
                      {new Date(entry.changedAt).toLocaleString()} — {entry.reason ?? "Stage updated"}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {application && (
              <div>
                <p className="mb-2 text-sm font-medium">Interviews</p>
                <ApplicationInterviewsPanel applicationId={application.id} />
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {application && candidate?.resume && (
        <ResumeViewerDialog
          applicationId={application.id}
          resume={candidate.resume}
          open={viewingResume}
          onOpenChange={setViewingResume}
        />
      )}
    </>
  );
}
