"use client";

import { Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { InterviewStatusBadge } from "@/components/interviews/interview-status-badge";
import type { Interview } from "@/types/interviews";

const RECOMMENDATION_LABEL: Record<string, string> = {
  STRONG_YES: "Strong yes",
  YES: "Yes",
  NO: "No",
  STRONG_NO: "Strong no",
};

const RECOMMENDATION_TONE: Record<string, string> = {
  STRONG_YES: "bg-[var(--viz-good)]/10 text-[var(--viz-good)] border-[var(--viz-good)]/30",
  YES: "bg-[var(--viz-good)]/10 text-[var(--viz-good)] border-[var(--viz-good)]/30",
  NO: "bg-[var(--viz-critical)]/10 text-[var(--viz-critical)] border-[var(--viz-critical)]/30",
  STRONG_NO: "bg-[var(--viz-critical)]/10 text-[var(--viz-critical)] border-[var(--viz-critical)]/30",
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium tabular-nums">{value}/5</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-[var(--viz-series-1)]" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
    </div>
  );
}

export function InterviewDetailDialog({
  interview,
  open,
  onOpenChange,
}: {
  interview: Interview | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Interview details</DialogTitle>
          {interview && (
            <DialogDescription>
              {new Date(interview.scheduledAt).toLocaleString()} · {interview.durationMinutes} minutes
            </DialogDescription>
          )}
        </DialogHeader>

        {interview && (
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex items-center gap-2">
              <InterviewStatusBadge status={interview.status} />
              {interview.meetingUrl && (
                <a href={interview.meetingUrl} className="text-xs text-accent underline underline-offset-4">
                  Meeting link
                </a>
              )}
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Recording</p>
              <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--viz-series-1)] text-white">
                  <Play className="size-4 fill-current" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                    <div className="h-full w-1/3 rounded-full bg-[var(--viz-series-1)]" />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Demo recording placeholder — not a real capture of this interview.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Transcript</p>
              <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground italic">
                Transcript capture isn&apos;t wired up yet — this is a placeholder for where it would appear once a
                recording pipeline exists.
              </div>
            </div>

            {interview.notes && (
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                <p className="text-sm">{interview.notes}</p>
              </div>
            )}

            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Scorecard</p>
              {interview.scorecard ? (
                <div className="flex flex-col gap-3 rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={RECOMMENDATION_TONE[interview.scorecard.recommendation]}>
                      {RECOMMENDATION_LABEL[interview.scorecard.recommendation]}
                    </Badge>
                  </div>
                  <ScoreBar label="Technical" value={interview.scorecard.technicalScore} />
                  <ScoreBar label="Communication" value={interview.scorecard.communicationScore} />
                  <ScoreBar label="Problem solving" value={interview.scorecard.problemSolvingScore} />
                  {interview.scorecard.feedback && (
                    <p className="border-t pt-2 text-xs text-muted-foreground">{interview.scorecard.feedback}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No scorecard submitted yet.</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
