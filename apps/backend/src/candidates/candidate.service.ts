import { ConflictError, NotFoundError } from "../shared/http/HttpError.ts";
import { isUniqueConstraintViolation } from "../shared/prismaErrors.ts";
import { CandidateRepository } from "./candidate.repository.ts";
import type { UpdateCandidateProfileRequestBody } from "./dto.ts";
import { toCandidateProfile, type CandidateProfile } from "./types.ts";
import { assertValidPhone } from "./validation.ts";

export class CandidateService {
  constructor(private readonly candidateRepository: CandidateRepository) {}

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
}
