import { Queue } from "bullmq";
import { connection, defaultJobOptions } from "./queue.service.ts";

export interface ApplicationRankJobData {
  applicationId: string;
}

export const APPLICATION_RANK_QUEUE_NAME = "application.rank";

export const applicationRankQueue = new Queue<ApplicationRankJobData>(APPLICATION_RANK_QUEUE_NAME, {
  connection,
  defaultJobOptions,
});
