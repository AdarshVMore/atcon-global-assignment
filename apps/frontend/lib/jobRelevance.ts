import type { Job } from "@/types/jobs";
import type { Resume } from "@/types/candidates";

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/i)
      .filter((word) => word.length > 2),
  );
}

/**
 * A rough, entirely client-side relevance score (0-100) between a job and
 * the candidate's most recently parsed resume — keyword overlap only, no
 * LLM call. The backend only ranks a candidate against a job *after* they
 * apply; this is a lightweight approximation for sorting job listings
 * before that, computed from data the candidate already has locally.
 */
export function scoreJobRelevance(job: Job, resume: Resume | undefined): number {
  if (!resume?.parsedData) return 0;

  const jobTokens = tokenize([job.title, job.description, job.requirements].join(" "));
  if (jobTokens.size === 0) return 0;

  const skills = resume.parsedData.structured?.skills ?? [];
  const skillTokens = skills.flatMap((skill) => [...tokenize(skill)]);
  const resumeTokens = tokenize(resume.parsedData.rawText);

  let skillHits = 0;
  for (const token of skillTokens) {
    if (jobTokens.has(token)) skillHits += 1;
  }

  let overlap = 0;
  for (const token of jobTokens) {
    if (resumeTokens.has(token)) overlap += 1;
  }

  const skillScore = skillTokens.length > 0 ? skillHits / skillTokens.length : 0;
  const overlapScore = overlap / jobTokens.size;

  return Math.round(Math.min(1, skillScore * 0.7 + overlapScore * 0.3) * 100);
}

export function mostRecentParsedResume(resumes: Resume[]): Resume | undefined {
  return resumes.find((resume) => resume.status === "PARSED" && resume.parsedData);
}
