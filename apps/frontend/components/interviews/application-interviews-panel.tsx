"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { InterviewStatusBadge } from "@/components/interviews/interview-status-badge";
import { InterviewDetailDialog } from "@/components/interviews/interview-detail-dialog";
import { LoadingState } from "@/components/layout/loading-state";
import type { Interview } from "@/types/interviews";
import { useInterviewsForApplication } from "@/features/interviews/useInterviews";
import {
  useCancelInterview,
  useCompleteInterview,
  useRescheduleInterview,
  useScheduleInterview,
  useSubmitScorecard,
} from "@/features/interviews/useInterviewMutations";
import { ApiError } from "@/lib/api/error";
import type { ScorecardRecommendation } from "@/types/interviews";

export function ApplicationInterviewsPanel({ applicationId }: { applicationId: string }) {
  const { data: interviews, isLoading } = useInterviewsForApplication(applicationId);
  const scheduleInterview = useScheduleInterview(applicationId);
  const cancelInterview = useCancelInterview();
  const completeInterview = useCompleteInterview();
  const rescheduleInterview = useRescheduleInterview();

  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(30);
  const [scorecardOpenFor, setScorecardOpenFor] = useState<string | null>(null);
  const [rescheduleOpenFor, setRescheduleOpenFor] = useState<string | null>(null);
  const [rescheduleValue, setRescheduleValue] = useState("");
  const [detailInterview, setDetailInterview] = useState<Interview | null>(null);

  function handleSchedule(event: React.FormEvent) {
    event.preventDefault();
    scheduleInterview.mutate(
      { scheduledAt: new Date(scheduledAt).toISOString(), durationMinutes: duration },
      {
        onSuccess: () => {
          setScheduledAt("");
          toast.success("Interview scheduled");
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not schedule interview."),
      },
    );
  }

  if (isLoading) return <LoadingState rows={2} />;

  return (
    <div className="flex flex-col gap-3">
      {(interviews ?? []).map((interview) => (
        <div key={interview.id} className="rounded-lg border p-2.5">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left hover:opacity-70"
            onClick={() => setDetailInterview(interview)}
          >
            <p className="text-sm underline decoration-dotted underline-offset-2">
              {new Date(interview.scheduledAt).toLocaleString()}
            </p>
            <InterviewStatusBadge status={interview.status} />
          </button>
          <p className="text-xs text-muted-foreground">{interview.durationMinutes} minutes</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(interview.status === "SCHEDULED" || interview.status === "RESCHEDULED") && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    completeInterview.mutate(interview.id, {
                      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not complete."),
                    })
                  }
                >
                  Mark complete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    cancelInterview.mutate(interview.id, {
                      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not cancel."),
                    })
                  }
                >
                  Cancel
                </Button>
                <Button size="sm" variant="outline" onClick={() => setRescheduleOpenFor(interview.id)}>
                  Reschedule
                </Button>
              </>
            )}
            {interview.status === "COMPLETED" && !interview.scorecard && (
              <Button size="sm" variant="outline" onClick={() => setScorecardOpenFor(interview.id)}>
                Submit scorecard
              </Button>
            )}
            {interview.scorecard && (
              <p className="text-xs text-muted-foreground">
                Scorecard: {interview.scorecard.recommendation.replace("_", " ")}
              </p>
            )}
          </div>
          {scorecardOpenFor === interview.id && (
            <ScorecardForm interviewId={interview.id} onDone={() => setScorecardOpenFor(null)} />
          )}
          {rescheduleOpenFor === interview.id && (
            <form
              className="mt-2 flex items-center gap-2 border-t pt-2"
              onSubmit={(event) => {
                event.preventDefault();
                rescheduleInterview.mutate(
                  { interviewId: interview.id, scheduledAt: new Date(rescheduleValue).toISOString() },
                  {
                    onSuccess: () => {
                      toast.success("Interview rescheduled");
                      setRescheduleOpenFor(null);
                      setRescheduleValue("");
                    },
                    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not reschedule."),
                  },
                );
              }}
            >
              <Input
                type="datetime-local"
                required
                value={rescheduleValue}
                onChange={(event) => setRescheduleValue(event.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="sm" disabled={rescheduleInterview.isPending}>
                Save
              </Button>
            </form>
          )}
        </div>
      ))}
      {(interviews ?? []).length === 0 && <p className="text-sm text-muted-foreground">No interviews scheduled.</p>}

      <form onSubmit={handleSchedule} className="flex flex-col gap-2 rounded-lg border p-2.5">
        <p className="text-sm font-medium">Schedule interview</p>
        <div className="flex gap-2">
          <Input
            type="datetime-local"
            required
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
            className="flex-1"
          />
          <Input
            type="number"
            min={15}
            step={15}
            required
            value={duration}
            onChange={(event) => setDuration(Number(event.target.value))}
            className="w-24"
          />
        </div>
        <Button type="submit" size="sm" disabled={scheduleInterview.isPending}>
          {scheduleInterview.isPending ? "Scheduling..." : "Schedule"}
        </Button>
      </form>

      <InterviewDetailDialog
        interview={detailInterview}
        open={!!detailInterview}
        onOpenChange={(open) => !open && setDetailInterview(null)}
      />
    </div>
  );
}

function ScorecardForm({ interviewId, onDone }: { interviewId: string; onDone: () => void }) {
  const submitScorecard = useSubmitScorecard();
  const [technicalScore, setTechnicalScore] = useState(3);
  const [communicationScore, setCommunicationScore] = useState(3);
  const [problemSolvingScore, setProblemSolvingScore] = useState(3);
  const [recommendation, setRecommendation] = useState<ScorecardRecommendation>("YES");
  const [feedback, setFeedback] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    submitScorecard.mutate(
      { interviewId, input: { technicalScore, communicationScore, problemSolvingScore, recommendation, feedback } },
      {
        onSuccess: () => {
          toast.success("Scorecard submitted");
          onDone();
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not submit scorecard."),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2 border-t pt-2">
      {[
        { label: "Technical", value: technicalScore, set: setTechnicalScore },
        { label: "Communication", value: communicationScore, set: setCommunicationScore },
        { label: "Problem solving", value: problemSolvingScore, set: setProblemSolvingScore },
      ].map(({ label, value, set }) => (
        <div key={label} className="flex items-center justify-between gap-2">
          <Label className="text-xs">{label} (1-5)</Label>
          <Input
            type="number"
            min={1}
            max={5}
            required
            value={value}
            onChange={(event) => set(Number(event.target.value))}
            className="w-16"
          />
        </div>
      ))}
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">Recommendation</Label>
        <Select value={recommendation} onValueChange={(value) => setRecommendation(value as ScorecardRecommendation)}>
          <SelectTrigger size="sm" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="STRONG_YES">Strong yes</SelectItem>
            <SelectItem value="YES">Yes</SelectItem>
            <SelectItem value="NO">No</SelectItem>
            <SelectItem value="STRONG_NO">Strong no</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Textarea
        placeholder="Feedback (optional)"
        rows={2}
        value={feedback}
        onChange={(event) => setFeedback(event.target.value)}
      />
      <Button type="submit" size="sm" disabled={submitScorecard.isPending}>
        {submitScorecard.isPending ? "Submitting..." : "Submit scorecard"}
      </Button>
    </form>
  );
}
