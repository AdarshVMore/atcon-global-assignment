import { BadRequestError } from "../../shared/errors/HttpError.ts";

export function assertValidTitle(title: unknown): asserts title is string {
  if (typeof title !== "string" || title.trim().length === 0) {
    throw new BadRequestError("Job title is required");
  }
}

export function assertValidDescription(description: unknown): asserts description is string {
  if (typeof description !== "string" || description.trim().length === 0) {
    throw new BadRequestError("Job description is required");
  }
}

export function assertValidRequirements(requirements: unknown): asserts requirements is string {
  if (typeof requirements !== "string" || requirements.trim().length === 0) {
    throw new BadRequestError("Job requirements are required");
  }
}

export function assertValidStageName(name: unknown): asserts name is string {
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new BadRequestError("Stage name is required");
  }
}
