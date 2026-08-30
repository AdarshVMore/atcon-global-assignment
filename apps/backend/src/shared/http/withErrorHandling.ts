import { logger } from "../logger.ts";
import { HttpError } from "./HttpError.ts";
import type { ApiErrorBody } from "./types.ts";

type RouteHandler<Req extends Request> = (req: Req) => Promise<Response> | Response;

export function withErrorHandling<Req extends Request>(handler: RouteHandler<Req>): RouteHandler<Req> {
  return async (req: Req): Promise<Response> => {
    try {
      return await handler(req);
    } catch (error) {
      if (error instanceof HttpError) {
        const body: ApiErrorBody = { error: { message: error.message } };
        return Response.json(body, { status: error.statusCode });
      }

      logger.error("Unhandled request error", {
        error: error instanceof Error ? error.message : String(error),
      });
      const body: ApiErrorBody = { error: { message: "Internal server error" } };
      return Response.json(body, { status: 500 });
    }
  };
}
