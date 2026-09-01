import type { Resume } from "@atcon/database";
import type { CandidateWithUser } from "./candidate.repository.ts";

export interface CandidateProfile {
  id: string;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export interface CandidateProfileWithResume extends CandidateProfile {
  /** The resume the candidate actually applied with — not their full history. */
  resume: Resume | null;
}

export function toCandidateProfile(candidate: CandidateWithUser): CandidateProfile {
  return {
    id: candidate.id,
    phone: candidate.phone,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
    user: {
      id: candidate.user.id,
      email: candidate.user.email,
      name: candidate.user.name,
    },
  };
}
