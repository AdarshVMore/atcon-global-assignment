import { describe, expect, test } from "bun:test";
import type OpenAI from "openai";
import { CandidateJobMatcher } from "../../src/modules/ranking/candidateJobMatcher.ts";

function fakeClient(content: string): OpenAI {
  return {
    chat: { completions: { create: async () => ({ choices: [{ message: { content } }] }) } },
  } as unknown as OpenAI;
}

const JOB = { title: "Backend Engineer", description: "Build APIs", requirements: "TypeScript" };

describe("CandidateJobMatcher", () => {
  test("parses a well-formed response", async () => {
    const matcher = new CandidateJobMatcher(fakeClient(JSON.stringify({ score: 82, reasoning: "Strong match" })));

    const result = await matcher.score(JOB, "5 years TypeScript backend experience");

    expect(result.score).toBe(82);
    expect(result.reasoning).toBe("Strong match");
  });

  test("clamps an out-of-range score into 0-100", async () => {
    const matcher = new CandidateJobMatcher(fakeClient(JSON.stringify({ score: 150, reasoning: "x" })));

    const result = await matcher.score(JOB, "resume text");

    expect(result.score).toBe(100);
  });

  test("throws when the response has no numeric score", async () => {
    const matcher = new CandidateJobMatcher(fakeClient(JSON.stringify({ reasoning: "x" })));

    await expect(matcher.score(JOB, "resume text")).rejects.toThrow("missing a numeric score");
  });

  test("throws when the response isn't valid JSON", async () => {
    const matcher = new CandidateJobMatcher(fakeClient("not json"));

    await expect(matcher.score(JOB, "resume text")).rejects.toThrow("OpenRouter response was not valid JSON");
  });
});
