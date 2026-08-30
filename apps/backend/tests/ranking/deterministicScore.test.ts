import { describe, expect, test } from "bun:test";
import { computeDeterministicScore } from "../../src/modules/ranking/deterministicScore.ts";

describe("computeDeterministicScore", () => {
  test("scores 100 when every job keyword appears in the candidate's skills", () => {
    const result = computeDeterministicScore("TypeScript and PostgreSQL for the role", ["TypeScript", "PostgreSQL"], "");

    expect(result.score).toBe(100);
  });

  test("scores 0 when nothing overlaps", () => {
    const result = computeDeterministicScore("Backend Engineer needing Rust and Kubernetes", ["Photoshop"], "");

    expect(result.score).toBe(0);
  });

  test("partially matches on candidate resume text as well as skills", () => {
    const result = computeDeterministicScore(
      "Looking for someone with TypeScript and PostgreSQL and Docker",
      ["TypeScript"],
      "I have used PostgreSQL extensively in past roles",
    );

    expect(result.matchedKeywords).toEqual(expect.arrayContaining(["typescript", "postgresql"]));
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);
  });

  test("returns 0 for a job with no meaningful keywords", () => {
    const result = computeDeterministicScore("the and for", [], "anything");

    expect(result.score).toBe(0);
    expect(result.totalJobKeywords).toBe(0);
  });
});
