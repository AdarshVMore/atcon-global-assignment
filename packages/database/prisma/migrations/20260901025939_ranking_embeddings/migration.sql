-- AlterTable
ALTER TABLE "Job" ADD COLUMN "embedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[];

-- AlterTable
ALTER TABLE "Resume" ADD COLUMN "embedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[];

-- Backfill existing rows (default only applies to new rows)
UPDATE "Job" SET "embedding" = ARRAY[]::DOUBLE PRECISION[] WHERE "embedding" IS NULL;
UPDATE "Resume" SET "embedding" = ARRAY[]::DOUBLE PRECISION[] WHERE "embedding" IS NULL;

ALTER TABLE "Job" ALTER COLUMN "embedding" SET NOT NULL;
ALTER TABLE "Resume" ALTER COLUMN "embedding" SET NOT NULL;
