import IORedis from "ioredis";
import { config } from "../../config/env.ts";

export function createRedisConnection(): IORedis {
  return new IORedis(config.redisUrl, {
    // Required by BullMQ: it manages its own retry/backoff around blocking commands.
    maxRetriesPerRequest: null,
  });
}
