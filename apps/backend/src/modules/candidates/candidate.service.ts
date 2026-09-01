import { ConflictError, NotFoundError } from "../../shared/errors/HttpError.ts";
import { isUniqueConstraintViolation } from "../../shared/utils/prismaErrors.ts";
import { ApplicationRepository } from "../applications/application.repository.ts";
import { ResumeRepository } from "../resumes/resume.repository.ts";
import { CandidateRepository } from "./candidate.repository.ts";
import type { UpdateCandidateProfileRequestBody } from "./dto.ts";
import { toCandidateProfile, type CandidateProfile, type CandidateProfileWithResume } from "./candidate.types.ts";
import { assertValidPhone } from "./validation.ts";

export class CandidateService {
  constructor(
    private readonly candidateRepository: CandidateRepository,
    private readonly applicationRepository: ApplicationRepository,
    private readonly resumeRepository: ResumeRepository,
  ) {}

  async getProfile(userId: string): Promise<CandidateProfile> {
    const candidate = await this.candidateRepository.findByUserId(userId);
    if (!candidate) {
      throw new NotFoundError("Candidate profile not found");
    }
    return toCandidateProfile(candidate);
  }

  async updateProfile(userId: string, input: UpdateCandidateProfileRequestBody): Promise<CandidateProfile> {
    const candidate = await this.candidateRepository.findByUserId(userId);
    if (!candidate) {
      throw new NotFoundError("Candidate profile not found");
    }
    if (input.phone === undefined) {
      return toCandidateProfile(candidate);
    }

    assertValidPhone(input.phone);
    try {
      const updated = await this.candidateRepository.updatePhone(candidate.id, input.phone);
      return toCandidateProfile(updated);
    } catch (error) {
      if (isUniqueConstraintViolation(error, "phone")) {
        throw new ConflictError("This phone number is already associated with another account");
      }
      throw error;
    }
  }

  /**
   * A recruiter may view the profile of a candidate who applied to one of
   * their own jobs — including the resume that application actually used,
   * not the candidate's full resume history (other applications, other
   * jobs, aren't this recruiter's to see). Access is scoped through the
   * application relationship rather than a bare candidate id, so a
   * recruiter can never browse candidates who never applied to them.
   */
  async getProfileForRecruiter(recruiterId: string, applicationId: string): Promise<CandidateProfileWithResume> {
    const application = await this.applicationRepository.findById(applicationId);
    if (!application || application.job.recruiterId !== recruiterId) {
      throw new NotFoundError("Application not found");
    }

    const candidate = await this.candidateRepository.findByIdWithUser(application.candidateId);
    if (!candidate) {
      throw new NotFoundError("Candidate not found");
    }

    const resume = application.resumeId ? await this.resumeRepository.findById(application.resumeId) : null;
    return { ...toCandidateProfile(candidate), resume };
  }
}
