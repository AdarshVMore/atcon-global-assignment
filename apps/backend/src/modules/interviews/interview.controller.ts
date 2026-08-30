import type { BunRequest } from "bun";
import type { AuthenticatedRequest } from "../auth/auth.middleware.ts";
import { parseJsonBody } from "../../shared/utils/parseJsonBody.ts";
import type {
  RescheduleInterviewRequestBody,
  ScheduleInterviewRequestBody,
  SubmitScorecardRequestBody,
  UpdateInterviewRequestBody,
} from "./dto.ts";
import type { InterviewService } from "./interview.service.ts";

export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  schedule = async (req: AuthenticatedRequest<BunRequest<"/applications/:applicationId/interviews">>): Promise<Response> => {
    const body = await parseJsonBody<ScheduleInterviewRequestBody>(req);
    const interview = await this.interviewService.scheduleInterview(req.user.id, req.params.applicationId, body);
    return Response.json(interview, { status: 201 });
  };

  listForApplication = async (
    req: AuthenticatedRequest<BunRequest<"/applications/:applicationId/interviews">>,
  ): Promise<Response> => {
    const interviews = await this.interviewService.listInterviewsForApplication(req.params.applicationId, req.user);
    return Response.json({ interviews });
  };

  getById = async (req: AuthenticatedRequest<BunRequest<"/interviews/:interviewId">>): Promise<Response> => {
    const interview = await this.interviewService.getInterviewForViewer(req.params.interviewId, req.user);
    return Response.json(interview);
  };

  update = async (req: AuthenticatedRequest<BunRequest<"/interviews/:interviewId">>): Promise<Response> => {
    const body = await parseJsonBody<UpdateInterviewRequestBody>(req);
    const interview = await this.interviewService.updateInterview(req.user.id, req.params.interviewId, body);
    return Response.json(interview);
  };

  reschedule = async (req: AuthenticatedRequest<BunRequest<"/interviews/:interviewId/reschedule">>): Promise<Response> => {
    const body = await parseJsonBody<RescheduleInterviewRequestBody>(req);
    const interview = await this.interviewService.rescheduleInterview(req.user.id, req.params.interviewId, body);
    return Response.json(interview);
  };

  cancel = async (req: AuthenticatedRequest<BunRequest<"/interviews/:interviewId/cancel">>): Promise<Response> => {
    const interview = await this.interviewService.cancelInterview(req.user.id, req.params.interviewId);
    return Response.json(interview);
  };

  complete = async (req: AuthenticatedRequest<BunRequest<"/interviews/:interviewId/complete">>): Promise<Response> => {
    const interview = await this.interviewService.completeInterview(req.user.id, req.params.interviewId);
    return Response.json(interview);
  };

  submitScorecard = async (req: AuthenticatedRequest<BunRequest<"/interviews/:interviewId/scorecard">>): Promise<Response> => {
    const body = await parseJsonBody<SubmitScorecardRequestBody>(req);
    const scorecard = await this.interviewService.submitScorecard(req.user.id, req.params.interviewId, body);
    return Response.json(scorecard, { status: 201 });
  };
}
