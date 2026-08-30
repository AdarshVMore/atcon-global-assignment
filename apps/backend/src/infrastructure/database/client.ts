import { prisma } from "@atcon/database";

export { prisma };

export async function verifyDatabaseConnection(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}
