-- AlterTable: add nullable first so existing rows aren't blocked by NOT NULL
ALTER TABLE "Notification" ADD COLUMN "sourceJobId" TEXT;
ALTER TABLE "Notification" ADD COLUMN "processedAt" TIMESTAMP(3);

-- Backfill: existing rows predate BullMQ-job-id tracking and were already
-- delivered — a synthetic unique placeholder is safe since those jobs will
-- never be redelivered.
UPDATE "Notification" SET "sourceJobId" = 'legacy-' || "id" WHERE "sourceJobId" IS NULL;
UPDATE "Notification" SET "processedAt" = "createdAt" WHERE "processedAt" IS NULL;

ALTER TABLE "Notification" ALTER COLUMN "sourceJobId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Notification_sourceJobId_key" ON "Notification"("sourceJobId");
