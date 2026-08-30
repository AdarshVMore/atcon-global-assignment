import type { HealthService } from "./health.service.ts";

export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  check = async (): Promise<Response> => {
    try {
      await this.healthService.checkDatabaseConnection();
      return Response.json({ status: "ok" });
    } catch {
      return Response.json({ status: "degraded" }, { status: 503 });
    }
  };
}
