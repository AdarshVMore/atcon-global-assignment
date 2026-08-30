import { prisma, Role, type User } from "@atcon/database";

export interface CreateUserWithRoleInput {
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
  phone?: string;
}

export class UserRepository {
  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  createWithRole(input: CreateUserWithRoleInput): Promise<User> {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash: input.passwordHash,
          role: input.role,
        },
      });

      if (input.role === Role.CANDIDATE) {
        await tx.candidate.create({
          data: { userId: user.id, phone: input.phone },
        });
      }

      return user;
    });
  }
}
