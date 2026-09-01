import { prisma, type Candidate, type User } from "@atcon/database";

export type CandidateWithUser = Candidate & { user: User };

export class CandidateRepository {
  findById(id: string): Promise<Candidate | null> {
    return prisma.candidate.findUnique({ where: { id } });
  }

  findByIdWithUser(id: string): Promise<CandidateWithUser | null> {
    return prisma.candidate.findUnique({ where: { id }, include: { user: true } });
  }

  findByUserId(userId: string): Promise<CandidateWithUser | null> {
    return prisma.candidate.findUnique({ where: { userId }, include: { user: true } });
  }

  updatePhone(candidateId: string, phone: string): Promise<CandidateWithUser> {
    return prisma.candidate.update({
      where: { id: candidateId },
      data: { phone },
      include: { user: true },
    });
  }
}
