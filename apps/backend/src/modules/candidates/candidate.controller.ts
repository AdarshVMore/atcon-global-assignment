import type { AuthenticatedRequest } from "../auth/auth.middleware.ts";
import { parseJsonBody } from "../../shared/utils/parseJsonBody.ts";
import type { CandidateService } from "./candidate.service.ts";
import type { UpdateCandidateProfileRequestBody } from "./dto.ts";

export class CandidateController {
  constructor(private readonly candidateService: CandidateService) {}

  getProfile = async (req: AuthenticatedRequest): Promise<Response> => {
    const candidate = await this.candidateService.getProfile(req.user.id);
    return Response.json(candidate);
  };

  updateProfile = async (req: AuthenticatedRequest): Promise<Response> => {
    const body = await parseJsonBody<UpdateCandidateProfileRequestBody>(req);
    const candidate = await this.candidateService.updateProfile(req.user.id, body);
    return Response.json(candidate);
  };
}
