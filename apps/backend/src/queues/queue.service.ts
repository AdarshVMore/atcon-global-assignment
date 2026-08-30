import { UnrecoverableError, Worker, type DefaultJobOptions, type Job, type Processor } from "bullmq";
import { createRedisConnection } from "../infrastructure/redis/redisConnection.ts";
import { logger } from "../shared/utils/logger.ts";

export const connection = createRedisConnection();

export const defaultJobOptions: DefaultJobOptions = {
  attempts: 5,
  backoff: { type: "exponential", delay: 2000 },
  removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
  removeOnFail: { age: 7 * 24 * 60 * 60 },
};

export interface CreateWorkerOptions<DataType, ResultType> {
  concurrency?: number;
  /**
   * Called once a job has exhausted all of its configured retry attempts.
   * This is where a queue should record a terminal failure (e.g. mark a
   * Resume FAILED) — the processor itself should just throw and let BullMQ
   * handle retry timing.
   */
  onFinalFailure?: (job: Job<DataType, ResultType> | undefined, error: Error) => Promise<void> | void;
}

export function createWorker<DataType, ResultType = void>(
  queueName: string,
  processor: Processor<DataType, ResultType>,
  options: CreateWorkerOptions<DataType, ResultType> = {},
): Worker<DataType, ResultType> {
  const worker = new Worker<DataType, ResultType>(queueName, processor, {
    connection: createRedisConnection(),
    concurrency: options.concurrency ?? 5,
  });

  worker.on("completed", (job) => {
    logger.info("Job completed", { queue: queueName, jobId: job.id, attemptsMade: job.attemptsMade });
  });

  worker.on("failed", (job, error) => {
    const isFinalAttempt =
      !job || job.attemptsMade >= (job.opts.attempts ?? 1) || error instanceof UnrecoverableError;
    logger.error("Job attempt failed", {
      queue: queueName,
      jobId: job?.id,
      attemptsMade: job?.attemptsMade,
      final: isFinalAttempt,
      error: error.message,
    });

    if (isFinalAttempt && options.onFinalFailure) {
      Promise.resolve(options.onFinalFailure(job, error)).catch((hookError) => {
        logger.error("onFinalFailure hook threw", {
          queue: queueName,
          jobId: job?.id,
          error: hookError instanceof Error ? hookError.message : String(hookError),
        });
      });
    }
  });

  return worker;
}
