export interface CandidateProfile {
  id: string;
  userId: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ResumeStatus = "UPLOADED" | "PROCESSING" | "PARSED" | "FAILED";

export interface Resume {
  id: string;
  candidateId: string;
  fileUrl: string;
  originalFileName: string;
  mimeType: string;
  fileHash: string;
  status: ResumeStatus;
  parsedData: unknown;
  parseError: string | null;
  uploadedAt: string;
  parsedAt: string | null;
}
