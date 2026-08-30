import { prisma, type Prisma, type Resume } from "@atcon/database";

export interface CreateResumeInput {
  candidateId: string;
  fileUrl: string;
  originalFileName: string;
  mimeType: string;
  fileHash: string;
}

export interface UpdateResumeStatusInput {
  status: Resume["status"];
  parsedAt?: Date;
  parsedData?: Prisma.InputJsonValue;
  parseError?: string;
}

export class ResumeRepository {
  create(input: CreateResumeInput): Promise<Resume> {
    return prisma.resume.create({ data: input });
  }

  findById(id: string): Promise<Resume | null> {
    return prisma.resume.findUnique({ where: { id } });
  }

  findByCandidateAndHash(candidateId: string, fileHash: string): Promise<Resume | null> {
    return prisma.resume.findFirst({ where: { candidateId, fileHash } });
  }

  findByCandidateId(candidateId: string): Promise<Resume[]> {
    return prisma.resume.findMany({ where: { candidateId }, orderBy: { uploadedAt: "desc" } });
  }

  updateStatus(id: string, input: UpdateResumeStatusInput): Promise<Resume> {
    return prisma.resume.update({ where: { id }, data: input });
  }
}
