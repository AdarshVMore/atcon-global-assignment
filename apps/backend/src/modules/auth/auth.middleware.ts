import type { Role } from "@atcon/database";
import { ForbiddenError, UnauthorizedError } from "../../shared/errors/HttpError.ts";
import { verifyAccessToken } from "./token.ts";
import type { AuthenticatedUser } from "./auth.types.ts";

export type AuthenticatedRequest<Req extends Request = Request> = Req & { user: AuthenticatedUser };

function extractBearerToken(req: Request): string {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing bearer token");
  }
  return header.slice("Bearer ".length);
}

export function requireAuth<Req extends Request>(
  handler: (req: AuthenticatedRequest<Req>) => Promise<Response> | Response,
): (req: Req) => Promise<Response> {
  return async (req: Req): Promise<Response> => {
    const token = extractBearerToken(req);
    const user = await verifyAccessToken(token);
    return handler(Object.assign(req, { user }));
  };
}

export function requireRole<Req extends Request>(
  roles: Role[],
  handler: (req: AuthenticatedRequest<Req>) => Promise<Response> | Response,
): (req: Req) => Promise<Response> {
  return requireAuth<Req>((req) => {
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError("You do not have access to this resource");
    }
    return handler(req);
  });
}
