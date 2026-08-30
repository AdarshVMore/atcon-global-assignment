import { HealthController } from "./health/health.controller.ts";
import { HealthService } from "./health/health.service.ts";
import { withErrorHandling } from "./shared/http/withErrorHandling.ts";

export function buildRoutes() {
  const healthController = new HealthController(new HealthService());

  return {
    "/health": {
      GET: withErrorHandling(healthController.check),
    },
  };
}
