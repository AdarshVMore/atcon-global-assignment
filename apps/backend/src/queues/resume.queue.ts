import { Queue } from "bullmq";
import { connection, defaultJobOptions } from "./queue.service.ts";

export interface ResumeParseJobData {
  resumeId: string;
}

export const RESUME_PARSE_QUEUE_NAME = "resume.parse";

export const resumeParseQueue = new Queue<ResumeParseJobData>(RESUME_PARSE_QUEUE_NAME, {
  connection,
  defaultJobOptions,
});
