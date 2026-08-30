import { BadRequestError } from "../shared/http/HttpError.ts";

const PHONE_PATTERN = /^\+?[0-9\s()-]{7,20}$/;

export function assertValidPhone(phone: unknown): asserts phone is string {
  if (typeof phone !== "string" || !PHONE_PATTERN.test(phone)) {
    throw new BadRequestError("A valid phone number is required");
  }
}
