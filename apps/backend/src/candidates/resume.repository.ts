import { prisma, type Resume } from "@atcon/database";

export interface CreateResumeInput {
  candidateId: string;
  fileUrl: string;
  originalFileName: string;
  mimeType: string;
  fileHash: string;
}

export class ResumeRepository {
  create(input: CreateResumeInput): Promise<Resume> {
    return prisma.resume.create({ data: input });
  }

  findByCandidateAndHash(candidateId: string, fileHash: string): Promise<Resume | null> {
    return prisma.resume.findFirst({ where: { candidateId, fileHash } });
  }

  findByCandidateId(candidateId: string): Promise<Resume[]> {
    return prisma.resume.findMany({ where: { candidateId }, orderBy: { uploadedAt: "desc" } });
  }
}
