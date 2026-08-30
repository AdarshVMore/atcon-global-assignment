import { ResumeStatus } from "@atcon/database";
import type { Job, Worker } from "bullmq";
import { prisma } from "../database/client.ts";
import { createWorker } from "../queue/createWorker.ts";
import type { ResumeParseJobData } from "../queue/jobs.ts";
import { QUEUE_NAMES } from "../queue/queueNames.ts";

async function processResumeParseJob(job: Job<ResumeParseJobData>): Promise<void> {
  const resume = await prisma.resume.findUnique({ where: { id: job.data.resumeId } });
  if (!resume || resume.status === ResumeStatus.PARSED) {
    // Deleted, or already finished by an earlier delivery of this same job.
    return;
  }

  await prisma.resume.update({ where: { id: resume.id }, data: { status: ResumeStatus.PROCESSING } });

  // Real text extraction and OpenRouter parsing are added in Phase 9. For
  // now this only proves the queue/worker mechanism and the resume's
  // processing-status lifecycle.
  await prisma.resume.update({
    where: { id: resume.id },
    data: { status: ResumeStatus.PARSED, parsedAt: new Date() },
  });
}

export function startResumeParseWorker(): Worker<ResumeParseJobData> {
  return createWorker<ResumeParseJobData>(QUEUE_NAMES.RESUME_PARSE, processResumeParseJob, {
    onFinalFailure: async (job) => {
      if (!job) {
        return;
      }
      await prisma.resume
        .update({
          where: { id: job.data.resumeId },
          data: { status: ResumeStatus.FAILED, parseError: "Resume processing failed after multiple attempts" },
        })
        .catch(() => {});
    },
  });
}
