"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { ErrorState } from "@/components/layout/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateJob } from "@/features/jobs/useJobMutations";
import { ApiError } from "@/lib/api/error";

export default function NewJobPage() {
  const router = useRouter();
  const createJob = useCreateJob();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [useCustomStages, setUseCustomStages] = useState(false);
  const [stages, setStages] = useState<string[]>(["Applied", "Hired"]);

  function updateStage(index: number, value: string) {
    setStages((prev) => prev.map((stage, i) => (i === index ? value : stage)));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    createJob.mutate(
      {
        title,
        description,
        requirements,
        stages: useCustomStages
          ? stages.filter((name) => name.trim().length > 0).map((name) => ({ name }))
          : undefined,
      },
      {
        onSuccess: (job) => router.push(`/recruiter/jobs/${job.id}`),
      },
    );
  }

  return (
    <PageContainer title="New job" description="Create a job posting. It starts as a draft.">
      <Card className="max-w-2xl">
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" required value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                required
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="requirements">Requirements</Label>
              <Textarea
                id="requirements"
                required
                rows={4}
                value={requirements}
                onChange={(event) => setRequirements(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2 rounded-lg border p-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useCustomStages}
                  onChange={(event) => setUseCustomStages(event.target.checked)}
                />
                Use a custom pipeline instead of the default 6-stage one
              </label>

              {useCustomStages && (
                <div className="flex flex-col gap-2">
                  {stages.map((stage, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input value={stage} onChange={(event) => updateStage(index, event.target.value)} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setStages((prev) => prev.filter((_, i) => i !== index))}
                      >
                        <X />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setStages((prev) => [...prev, ""])}
                  >
                    <Plus /> Add stage
                  </Button>
                </div>
              )}
            </div>

            {createJob.isError && (
              <ErrorState
                message={createJob.error instanceof ApiError ? createJob.error.message : "Could not create job."}
              />
            )}

            <Button type="submit" disabled={createJob.isPending}>
              {createJob.isPending ? "Creating..." : "Create job"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
