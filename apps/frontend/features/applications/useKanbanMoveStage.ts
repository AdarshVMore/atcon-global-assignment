"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { applicationsApi } from "@/lib/api/applications.api";
import type { Application } from "@/types/applications";
import type { JobStage } from "@/types/jobs";

/**
 * Moves a card between Kanban columns immediately (optimistic), then
 * reconciles with the server. On failure the query is rolled back to the
 * snapshot taken before the drag, so a rejected move visually un-does
 * itself instead of leaving a card sitting somewhere the backend refused.
 */
export function useKanbanMoveStage(queryKey: readonly unknown[]) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ applicationId, stageId }: { applicationId: string; stageId: string; targetStage: JobStage }) =>
      applicationsApi.moveStage(applicationId, stageId),

    onMutate: async ({ applicationId, targetStage }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Application[]>(queryKey);

      queryClient.setQueryData<Application[]>(queryKey, (current) =>
        current?.map((application) =>
          application.id === applicationId
            ? { ...application, currentStageId: targetStage.id, currentStage: targetStage }
            : application,
        ),
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
