import { BadRequestError } from "../shared/http/HttpError.ts";

export interface IncomingResumeFile {
  name: string;
  type: string;
  data: Uint8Array;
}

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;

export function assertValidResumeFile(file: IncomingResumeFile): void {
  if (!file.name || file.data.byteLength === 0) {
    throw new BadRequestError("A non-empty resume file is required");
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new BadRequestError("Resume must be a PDF or Word document");
  }
  if (file.data.byteLength > MAX_RESUME_SIZE_BYTES) {
    throw new BadRequestError("Resume file must be 5MB or smaller");
  }
}
