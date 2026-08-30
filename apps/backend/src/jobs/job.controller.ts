import type { BunRequest } from "bun";
import type { AuthenticatedRequest } from "../auth/middleware.ts";
import { parseJsonBody } from "../shared/http/parseJsonBody.ts";
import type { AddJobStageRequestBody, CreateJobRequestBody, UpdateJobRequestBody, UpdateJobStageRequestBody } from "./dto.ts";
import type { JobService } from "./job.service.ts";

export class JobController {
  constructor(private readonly jobService: JobService) {}

  create = async (req: AuthenticatedRequest): Promise<Response> => {
    const body = await parseJsonBody<CreateJobRequestBody>(req);
    const job = await this.jobService.createJob(req.user.id, body);
    return Response.json(job, { status: 201 });
  };

  list = async (req: AuthenticatedRequest): Promise<Response> => {
    const jobs = await this.jobService.listJobsForViewer(req.user);
    return Response.json({ jobs });
  };

  getById = async (req: AuthenticatedRequest<BunRequest<"/jobs/:jobId">>): Promise<Response> => {
    const job = await this.jobService.getJobForViewer(req.params.jobId, req.user);
    return Response.json(job);
  };

  update = async (req: AuthenticatedRequest<BunRequest<"/jobs/:jobId">>): Promise<Response> => {
    const body = await parseJsonBody<UpdateJobRequestBody>(req);
    const job = await this.jobService.updateJob(req.user.id, req.params.jobId, body);
    return Response.json(job);
  };

  publish = async (req: AuthenticatedRequest<BunRequest<"/jobs/:jobId/publish">>): Promise<Response> => {
    const job = await this.jobService.publishJob(req.user.id, req.params.jobId);
    return Response.json(job);
  };

  close = async (req: AuthenticatedRequest<BunRequest<"/jobs/:jobId/close">>): Promise<Response> => {
    const job = await this.jobService.closeJob(req.user.id, req.params.jobId);
    return Response.json(job);
  };

  addStage = async (req: AuthenticatedRequest<BunRequest<"/jobs/:jobId/stages">>): Promise<Response> => {
    const body = await parseJsonBody<AddJobStageRequestBody>(req);
    const job = await this.jobService.addStage(req.user.id, req.params.jobId, body);
    return Response.json(job, { status: 201 });
  };

  updateStage = async (req: AuthenticatedRequest<BunRequest<"/jobs/:jobId/stages/:stageId">>): Promise<Response> => {
    const body = await parseJsonBody<UpdateJobStageRequestBody>(req);
    const job = await this.jobService.updateStage(req.user.id, req.params.jobId, req.params.stageId, body);
    return Response.json(job);
  };
}
