import type { JobStage } from "@atcon/database";
import { BadRequestError, ConflictError } from "../shared/http/HttpError.ts";

/**
 * Generic rule, independent of any job's specific stage names: from a
 * non-terminal stage you can advance to the immediate next stage in
 * `order`, or jump straight to any terminal stage (covers rejection, or a
 * fast-tracked hire, from any point in the pipeline). No regressing to an
 * earlier stage, and nothing moves once a terminal stage is reached.
 */
export function assertValidStageTransition(currentStage: JobStage, targetStage: JobStage): void {
  if (currentStage.isTerminal) {
    throw new ConflictError("This application has already reached a terminal stage");
  }
  if (targetStage.id === currentStage.id) {
    throw new BadRequestError("Application is already in this stage");
  }
  if (targetStage.isTerminal) {
    return;
  }
  if (targetStage.order !== currentStage.order + 1) {
    throw new BadRequestError("Applications can only move to the next stage in sequence or a terminal stage");
  }
}
