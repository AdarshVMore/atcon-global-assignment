import { logger } from "./shared/logger.ts";
import { startApplicationRankWorker } from "./workers/applicationRank.worker.ts";
import { startResumeParseWorker } from "./workers/resumeParse.worker.ts";

const workers = [startResumeParseWorker(), startApplicationRankWorker()];

logger.info("Workers started", { count: workers.length });

async function shutdown(): Promise<void> {
  logger.info("Shutting down workers");
  await Promise.all(workers.map((worker) => worker.close()));
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
