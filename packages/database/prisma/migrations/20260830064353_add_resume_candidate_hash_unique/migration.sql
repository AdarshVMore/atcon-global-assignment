-- DropIndex
DROP INDEX "Resume_candidateId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Resume_candidateId_fileHash_key" ON "Resume"("candidateId", "fileHash");
