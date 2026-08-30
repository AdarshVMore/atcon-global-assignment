import { Queue, type DefaultJobOptions } from "bullmq";
import type { ApplicationRankJobData, NotificationSendJobData, ResumeParseJobData } from "./jobs.ts";
import { QUEUE_NAMES } from "./queueNames.ts";
import { createRedisConnection } from "./redisConnection.ts";

const connection = createRedisConnection();

const defaultJobOptions: DefaultJobOptions = {
  attempts: 5,
  backoff: { type: "exponential", delay: 2000 },
  removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
  removeOnFail: { age: 7 * 24 * 60 * 60 },
};

export const resumeParseQueue = new Queue<ResumeParseJobData>(QUEUE_NAMES.RESUME_PARSE, {
  connection,
  defaultJobOptions,
});

export const applicationRankQueue = new Queue<ApplicationRankJobData>(QUEUE_NAMES.APPLICATION_RANK, {
  connection,
  defaultJobOptions,
});

export const notificationSendQueue = new Queue<NotificationSendJobData>(QUEUE_NAMES.NOTIFICATION_SEND, {
  connection,
  defaultJobOptions,
});
