import { describe, expect, test } from "bun:test";
import type { JobStage } from "@atcon/database";
import { assertValidStageTransition } from "./pipeline.ts";

function buildStage(overrides: Partial<JobStage> = {}): JobStage {
  return {
    id: "stage-1",
    jobId: "job-1",
    name: "Applied",
    order: 1,
    isTerminal: false,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("assertValidStageTransition", () => {
  test("allows advancing to the immediate next stage", () => {
    const current = buildStage({ id: "a", order: 1 });
    const next = buildStage({ id: "b", order: 2 });

    expect(() => assertValidStageTransition(current, next)).not.toThrow();
  });

  test("rejects skipping ahead past the next stage", () => {
    const current = buildStage({ id: "a", order: 1 });
    const target = buildStage({ id: "c", order: 3 });

    expect(() => assertValidStageTransition(current, target)).toThrow(
      "Applications can only move to the next stage in sequence or a terminal stage",
    );
  });

  test("rejects moving backward to an earlier stage", () => {
    const current = buildStage({ id: "b", order: 2 });
    const target = buildStage({ id: "a", order: 1 });

    expect(() => assertValidStageTransition(current, target)).toThrow(
      "Applications can only move to the next stage in sequence or a terminal stage",
    );
  });

  test("allows jumping straight to a terminal stage from anywhere", () => {
    const current = buildStage({ id: "a", order: 1 });
    const rejected = buildStage({ id: "z", order: 99, isTerminal: true });

    expect(() => assertValidStageTransition(current, rejected)).not.toThrow();
  });

  test("rejects moving out of a terminal stage", () => {
    const current = buildStage({ id: "z", order: 99, isTerminal: true });
    const target = buildStage({ id: "a", order: 1 });

    expect(() => assertValidStageTransition(current, target)).toThrow(
      "This application has already reached a terminal stage",
    );
  });

  test("rejects moving to the same stage", () => {
    const current = buildStage({ id: "a", order: 1 });

    expect(() => assertValidStageTransition(current, current)).toThrow("Application is already in this stage");
  });
});
