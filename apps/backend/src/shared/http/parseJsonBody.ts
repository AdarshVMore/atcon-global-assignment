import { BadRequestError } from "./HttpError.ts";

export async function parseJsonBody<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new BadRequestError("Request body must be valid JSON");
  }
}
