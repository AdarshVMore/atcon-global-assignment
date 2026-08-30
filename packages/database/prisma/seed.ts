import { prisma } from "../src/index.ts";

async function main() {
  const recruiterPasswordHash = await Bun.password.hash("recruiter-password");
  const candidatePasswordHash = await Bun.password.hash("candidate-password");

  const recruiter = await prisma.user.upsert({
    where: { email: "recruiter@atcon.dev" },
    update: {},
    create: {
      email: "recruiter@atcon.dev",
      name: "Riya Recruiter",
      role: "RECRUITER",
      passwordHash: recruiterPasswordHash,
    },
  });

  const candidateUser = await prisma.user.upsert({
    where: { email: "candidate@atcon.dev" },
    update: {},
    create: {
      email: "candidate@atcon.dev",
      name: "Chris Candidate",
      role: "CANDIDATE",
      passwordHash: candidatePasswordHash,
      candidate: {
        create: { phone: "+1-555-0100" },
      },
    },
  });

  const job = await prisma.job.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      recruiterId: recruiter.id,
      title: "Backend Engineer",
      description: "Build and maintain our recruitment platform backend.",
      requirements: "TypeScript, PostgreSQL, distributed systems fundamentals.",
      status: "PUBLISHED",
      stages: {
        create: [
          { name: "Applied", order: 1 },
          { name: "Screening", order: 2 },
          { name: "Interview", order: 3 },
          { name: "Offer", order: 4 },
          { name: "Hired", order: 5, isTerminal: true },
          { name: "Rejected", order: 6, isTerminal: true },
        ],
      },
    },
    include: { stages: true },
  });

  const appliedStage = job.stages.find((stage) => stage.name === "Applied");
  if (!appliedStage) {
    throw new Error("Seed job is missing its Applied stage.");
  }

  const candidate = await prisma.candidate.findUniqueOrThrow({
    where: { userId: candidateUser.id },
  });

  await prisma.application.upsert({
    where: { candidateId_jobId: { candidateId: candidate.id, jobId: job.id } },
    update: {},
    create: {
      candidateId: candidate.id,
      jobId: job.id,
      currentStageId: appliedStage.id,
    },
  });

  console.log("Seeded recruiter, candidate, job, stages, and one application.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
