import type OpenAI from "openai";
import { config } from "../../config/env.ts";

export interface LlmRankingResult {
  score: number;
  reasoning: string;
}

const SYSTEM_PROMPT = `You score how well a candidate matches a job opening for an applicant tracking system. Respond with strict JSON only, matching exactly this shape, with no commentary or markdown fences:
{ "score": number, "reasoning": string }
"score" is 0-100, where 100 is a perfect match. Base the score only on the information given — do not assume qualifications that aren't stated. "reasoning" is one or two sentences explaining the score.`;

export interface JobSummary {
  title: string;
  description: string;
  requirements: string;
}

// Keeps the request cheap — a resume/job summary rarely needs more than
// this to produce a reasonable match judgment.
const MAX_INPUT_CHARS = 6_000;

export class CandidateJobMatcher {
  constructor(private readonly client: OpenAI) {}

  async score(job: JobSummary, candidateSummary: string): Promise<LlmRankingResult> {
    const userContent = [
      `Job title: ${job.title}`,
      `Job description: ${job.description}`,
      `Job requirements: ${job.requirements}`,
      `Candidate resume summary: ${candidateSummary || "(no resume information available)"}`,
    ]
      .join("\n\n")
      .slice(0, MAX_INPUT_CHARS);

    const completion = await this.client.chat.completions.create({
      model: config.openRouterModel,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenRouter returned an empty response");
    }

    return parseAndValidate(content);
  }
}

function parseAndValidate(content: string): LlmRankingResult {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new Error("OpenRouter response was not valid JSON");
  }

  if (typeof raw !== "object" || raw === null) {
    throw new Error("OpenRouter response was not a JSON object");
  }
  const value = raw as Record<string, unknown>;

  if (typeof value.score !== "number" || Number.isNaN(value.score)) {
    throw new Error("OpenRouter response was missing a numeric score");
  }

  const score = Math.max(0, Math.min(100, Math.round(value.score)));
  const reasoning = typeof value.reasoning === "string" ? value.reasoning : "";

  return { score, reasoning };
}
