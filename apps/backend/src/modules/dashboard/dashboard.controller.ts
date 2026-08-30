import type { BunRequest } from "bun";
import type { AuthenticatedRequest } from "../auth/auth.middleware.ts";
import type { DashboardService } from "./dashboard.service.ts";

export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  overview = async (req: AuthenticatedRequest): Promise<Response> => {
    const overview = await this.dashboardService.getOverview(req.user.id);
    return Response.json(overview);
  };

  jobPipeline = async (req: AuthenticatedRequest<BunRequest<"/jobs/:jobId/pipeline">>): Promise<Response> => {
    const pipeline = await this.dashboardService.getJobPipeline(req.user.id, req.params.jobId);
    return Response.json(pipeline);
  };
}
