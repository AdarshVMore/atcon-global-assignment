import { buildRoutes } from "./app.ts";
import { config } from "./config/env.ts";
import { verifyDatabaseConnection } from "./database/client.ts";
import { logger } from "./shared/logger.ts";

async function bootstrap(): Promise<void> {
  await verifyDatabaseConnection();
  logger.info("Database connection verified");

  const server = Bun.serve({
    port: config.port,
    routes: buildRoutes(),
  });

  logger.info(`Backend listening on http://localhost:${server.port}`);
}

bootstrap().catch((error) => {
  logger.error("Failed to start backend", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
