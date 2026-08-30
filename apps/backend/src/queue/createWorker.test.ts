import { afterEach, describe, expect, test } from "bun:test";
import { Queue, type Job } from "bullmq";
import { createWorker } from "./createWorker.ts";
import { createRedisConnection } from "./redisConnection.ts";

interface TestJobData {
  attempt?: number;
}

let queue: Queue<TestJobData> | undefined;
let worker: ReturnType<typeof createWorker<TestJobData>> | undefined;

afterEach(async () => {
  await worker?.close();
  await queue?.obliterate({ force: true }).catch(() => {});
  await queue?.close();
  worker = undefined;
  queue = undefined;
});

function uniqueQueueName(label: string): string {
  return `test.${label}.${crypto.randomUUID()}`;
}

describe("createWorker against a real Redis connection", () => {
  test("retries a failing job with backoff and eventually succeeds", async () => {
    const queueName = uniqueQueueName("retry-success");
    queue = new Queue<TestJobData>(queueName, { connection: createRedisConnection() });

    let attempts = 0;
    const completed = Promise.withResolvers<Job<TestJobData>>();

    worker = createWorker<TestJobData>(queueName, async () => {
      attempts += 1;
      if (attempts < 3) {
        throw new Error(`Simulated failure on attempt ${attempts}`);
      }
    });
    worker.on("completed", (job) => completed.resolve(job));

    await queue.add(
      "test-job",
      {},
      { attempts: 5, backoff: { type: "fixed", delay: 50 } },
    );

    const job = await completed.promise;

    expect(attempts).toBe(3);
    expect(job.attemptsMade).toBe(3);
  }, 10_000);

  test("calls onFinalFailure only after all retry attempts are exhausted", async () => {
    const queueName = uniqueQueueName("retry-exhausted");
    queue = new Queue<TestJobData>(queueName, { connection: createRedisConnection() });

    let attempts = 0;
    let finalFailureCalls = 0;
    const final = Promise.withResolvers<void>();

    worker = createWorker<TestJobData>(
      queueName,
      async () => {
        attempts += 1;
        throw new Error(`Simulated failure on attempt ${attempts}`);
      },
      {
        onFinalFailure: () => {
          finalFailureCalls += 1;
          final.resolve();
        },
      },
    );

    await queue.add(
      "test-job",
      {},
      { attempts: 3, backoff: { type: "fixed", delay: 50 } },
    );

    await final.promise;

    expect(attempts).toBe(3);
    expect(finalFailureCalls).toBe(1);
  }, 10_000);
});
