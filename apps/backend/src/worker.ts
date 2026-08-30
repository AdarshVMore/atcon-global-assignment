import { logger } from "./shared/utils/logger.ts";
import { startApplicationRankWorker } from "./workers/application-ranking.worker.ts";
import { startNotificationSendWorker } from "./workers/notification.worker.ts";
import { startResumeParseWorker } from "./workers/resume-parser.worker.ts";

const workers = [startResumeParseWorker(), startApplicationRankWorker(), startNotificationSendWorker()];

logger.info("Workers started", { count: workers.length });

async function shutdown(): Promise<void> {
  logger.info("Shutting down workers");
  await Promise.all(workers.map((worker) => worker.close()));
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
