import { describe, expect, test } from "bun:test";
import { cosineSimilarity } from "../../src/modules/ranking/cosineSimilarity.ts";

describe("cosineSimilarity", () => {
  test("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBe(1);
  });

  test("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });

  test("clamps negative similarity to 0", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBe(0);
  });

  test("returns 0 for mismatched lengths instead of throwing", () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  test("returns 0 for empty vectors", () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  test("returns 0 when either vector is all zeros", () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});
