import { Prisma } from "@atcon/database";

/**
 * The pg driver adapter reports Postgres unique-constraint violations via
 * `meta.driverAdapterError.cause.constraint.index` instead of Prisma's usual
 * `meta.target` column-name array, so both shapes need checking.
 */
export function isUniqueConstraintViolation(error: unknown, fieldNameHint: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  if (Array.isArray(error.meta?.target)) {
    return error.meta.target.includes(fieldNameHint);
  }

  const driverAdapterError = error.meta?.driverAdapterError as { cause?: { constraint?: { index?: string } } };
  const constraintIndex = driverAdapterError?.cause?.constraint?.index;
  return typeof constraintIndex === "string" && constraintIndex.toLowerCase().includes(fieldNameHint.toLowerCase());
}
