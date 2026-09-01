"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/page-container";
import { LoadingState } from "@/components/layout/loading-state";
import { ErrorState } from "@/components/layout/error-state";
import { CandidateProfileView } from "@/components/candidates/candidate-profile-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCandidateProfile,
  useResumes,
  useUpdateCandidateProfile,
  useUploadResume,
} from "@/features/candidates/useCandidateProfile";
import { ApiError } from "@/lib/api/error";
import type { CandidateProfile, ResumeStatus } from "@/types/candidates";

const resumeStatusStyles: Record<ResumeStatus, string> = {
  UPLOADED: "bg-muted text-muted-foreground",
  PROCESSING: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  PARSED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  FAILED: "bg-destructive/10 text-destructive",
};

export default function CandidateProfilePage() {
  const { data: profile, isLoading, isError, error, refetch } = useCandidateProfile();
  const { data: resumes } = useResumes();

  return (
    <PageContainer title="Profile" description="What recruiters see when they open your application.">
      {isLoading && <LoadingState />}
      {isError && (
        <ErrorState
          message={error instanceof ApiError ? error.message : "Could not load your profile."}
          onRetry={() => refetch()}
        />
      )}

      {profile && (
        <CandidateProfileView
          name={profile.user.name}
          email={profile.user.email}
          phone={profile.phone}
          resumes={resumes ?? []}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {profile && <EditContactCard profile={profile} />}
        <ResumesCard />
      </div>
    </PageContainer>
  );
}

function EditContactCard({ profile }: { profile: CandidateProfile }) {
  const updateProfile = useUpdateCandidateProfile();
  const [phone, setPhone] = useState(profile.phone ?? "");

  function handleSaveProfile(event: React.FormEvent) {
    event.preventDefault();
    updateProfile.mutate(phone, {
      onSuccess: () => toast.success("Profile updated"),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update profile."),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact info</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            Name and email come from your account. Skills, experience and education are read from your most
            recently parsed resume — upload a new one to update them.
          </p>
          <Button type="submit" size="sm" disabled={updateProfile.isPending} className="self-start">
            {updateProfile.isPending ? "Saving..." : "Save"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ResumesCard() {
  const { data: resumes } = useResumes();
  const uploadResume = useUploadResume();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadResume.mutate(file, {
      onSuccess: () => toast.success("Resume uploaded, parsing in the background"),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not upload resume."),
    });
    event.target.value = "";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {(resumes ?? []).map((resume) => (
            <div key={resume.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
              <span className="truncate">{resume.originalFileName}</span>
              <Badge variant="secondary" className={resumeStatusStyles[resume.status]}>
                {resume.status}
              </Badge>
            </div>
          ))}
          {(resumes ?? []).length === 0 && <p className="text-sm text-muted-foreground">No resumes uploaded yet.</p>}
          <input ref={fileInputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleFileChange} />
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            disabled={uploadResume.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadResume.isPending ? "Uploading..." : "Upload resume"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
