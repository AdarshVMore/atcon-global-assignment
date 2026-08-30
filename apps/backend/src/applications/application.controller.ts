import type { BunRequest } from "bun";
import type { AuthenticatedRequest } from "../auth/middleware.ts";
import { parseJsonBody } from "../shared/http/parseJsonBody.ts";
import type { ApplicationService } from "./application.service.ts";
import type { CreateApplicationRequestBody } from "./dto.ts";

export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  apply = async (req: AuthenticatedRequest<BunRequest<"/jobs/:jobId/applications">>): Promise<Response> => {
    const body = await parseJsonBody<CreateApplicationRequestBody>(req);
    const application = await this.applicationService.applyToJob(req.user.id, req.params.jobId, body);
    return Response.json(application, { status: 201 });
  };

  getById = async (req: AuthenticatedRequest<BunRequest<"/applications/:applicationId">>): Promise<Response> => {
    const application = await this.applicationService.getApplicationForViewer(req.params.applicationId, req.user);
    return Response.json(application);
  };

  list = async (req: AuthenticatedRequest): Promise<Response> => {
    const jobId = new URL(req.url).searchParams.get("jobId") ?? undefined;
    const applications = await this.applicationService.listApplicationsForViewer(req.user, jobId);
    return Response.json({ applications });
  };
}
