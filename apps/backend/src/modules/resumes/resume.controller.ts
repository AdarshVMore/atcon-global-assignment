import type { BunRequest } from "bun";
import type { AuthenticatedRequest } from "../auth/auth.middleware.ts";
import { BadRequestError } from "../../shared/errors/HttpError.ts";
import type { ResumeService } from "./resume.service.ts";

export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  upload = async (req: AuthenticatedRequest): Promise<Response> => {
    const formData = await req.formData().catch(() => {
      throw new BadRequestError("Request body must be multipart/form-data");
    });

    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new BadRequestError("A resume file is required under the 'file' field");
    }

    const data = new Uint8Array(await file.arrayBuffer());
    const resume = await this.resumeService.uploadResume(req.user.id, {
      name: file.name,
      type: file.type || "application/octet-stream",
      data,
    });
    return Response.json(resume, { status: 201 });
  };

  list = async (req: AuthenticatedRequest): Promise<Response> => {
    const resumes = await this.resumeService.listResumes(req.user.id);
    return Response.json({ resumes });
  };

  getFileForRecruiter = async (
    req: AuthenticatedRequest<BunRequest<"/applications/:applicationId/candidate/resumes/:resumeId">>,
  ): Promise<Response> => {
    const { bytes, resume } = await this.resumeService.getFileForRecruiter(
      req.user.id,
      req.params.applicationId,
      req.params.resumeId,
    );
    return new Response(bytes, {
      headers: {
        "Content-Type": resume.mimeType,
        "Content-Disposition": `inline; filename="${resume.originalFileName}"`,
      },
    });
  };
}
