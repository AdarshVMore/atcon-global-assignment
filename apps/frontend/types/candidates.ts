export interface CandidateProfile {
  id: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
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

export type ResumeStatus = "UPLOADED" | "PROCESSING" | "PARSED" | "FAILED";

export interface ParsedResumeEducation {
  institution: string;
  degree: string | null;
}

export interface ParsedResumeWorkExperience {
  company: string;
  title: string | null;
  durationYears: number | null;
}

export interface ParsedResumeStructured {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  summary: string | null;
  skills: string[];
  yearsOfExperience: number | null;
  education: ParsedResumeEducation[];
  workExperience: ParsedResumeWorkExperience[];
}

export interface ResumeParsedData {
  rawText: string;
  structured: ParsedResumeStructured | null;
}

export interface Resume {
  id: string;
  candidateId: string;
  fileUrl: string;
  originalFileName: string;
  mimeType: string;
  fileHash: string;
  status: ResumeStatus;
  parsedData: ResumeParsedData | null;
  parseError: string | null;
  uploadedAt: string;
  parsedAt: string | null;
}
