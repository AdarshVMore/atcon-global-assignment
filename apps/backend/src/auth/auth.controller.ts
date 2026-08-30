import { parseJsonBody } from "../shared/http/parseJsonBody.ts";
import type { AuthService } from "./auth.service.ts";
import type { LoginRequestBody, RegisterRequestBody } from "./dto.ts";
import type { AuthenticatedRequest } from "./middleware.ts";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request): Promise<Response> => {
    const body = await parseJsonBody<RegisterRequestBody>(req);
    const result = await this.authService.register(body);
    return Response.json(result, { status: 201 });
  };

  login = async (req: Request): Promise<Response> => {
    const body = await parseJsonBody<LoginRequestBody>(req);
    const result = await this.authService.login(body);
    return Response.json(result);
  };

  me = async (req: AuthenticatedRequest): Promise<Response> => {
    const user = await this.authService.getProfile(req.user.id);
    return Response.json({ user });
  };
}
