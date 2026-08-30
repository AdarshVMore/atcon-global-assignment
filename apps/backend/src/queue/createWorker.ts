import { UnrecoverableError, Worker, type Job, type Processor } from "bullmq";
import { logger } from "../shared/logger.ts";
import { createRedisConnection } from "./redisConnection.ts";

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
