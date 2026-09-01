"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/layout/loading-state";
import { ErrorState } from "@/components/layout/error-state";
import { candidatesApi } from "@/lib/api/candidates.api";
import { ApiError } from "@/lib/api/error";
import type { Resume } from "@/types/candidates";

interface ResumeViewerDialogProps {
  applicationId: string;
  resume: Resume | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResumeViewerDialog({ applicationId, resume, open, onOpenChange }: ResumeViewerDialogProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !resume) return;

    let cancelled = false;
    let createdUrl: string | null = null;
    setLoading(true);
    setError(null);
    setObjectUrl(null);

    candidatesApi
      .getResumeFile(applicationId, resume.id)
      .then((blob) => {
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setObjectUrl(createdUrl);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Could not load this resume.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [open, resume, applicationId]);

  const isPdf = resume?.mimeType === "application/pdf";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{resume?.originalFileName ?? "Resume"}</DialogTitle>
          {!isPdf && <DialogDescription>This file type can&apos;t be previewed inline.</DialogDescription>}
        </DialogHeader>

        {loading && <LoadingState rows={3} />}
        {error && <ErrorState message={error} />}

        {!loading && !error && objectUrl && isPdf && (
          <iframe
            src={objectUrl}
            title={resume?.originalFileName ?? "Resume"}
            className="h-[70vh] w-full rounded-md border"
          />
        )}

        {!loading && !error && objectUrl && !isPdf && (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-sm text-muted-foreground">
              {resume?.originalFileName} can&apos;t be previewed in the browser — download it instead.
            </p>
            <Button render={<a href={objectUrl} download={resume?.originalFileName} />}>Download</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
