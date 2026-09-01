"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useKanbanMoveStage } from "@/features/applications/useKanbanMoveStage";
import { ApiError } from "@/lib/api/error";
import type { Application } from "@/types/applications";
import type { JobStage } from "@/types/jobs";
import { KanbanCard } from "./kanban-card";

export function validTargetStageIds(currentStage: JobStage, stages: JobStage[]): Set<string> {
  if (currentStage.isTerminal) return new Set();
  const next = stages.find((stage) => stage.order === currentStage.order + 1);
  const terminals = stages.filter((stage) => stage.isTerminal && stage.id !== currentStage.id);
  return new Set([next, ...terminals].filter((stage): stage is JobStage => !!stage).map((stage) => stage.id));
}

interface KanbanBoardProps {
  stages: JobStage[];
  applications: Application[];
  queryKey: readonly unknown[];
  onCardClick?: (application: Application) => void;
  cardMeta?: (application: Application) => React.ReactNode;
  interactive?: boolean;
}

export function KanbanBoard({
  stages,
  applications,
  queryKey,
  onCardClick,
  cardMeta,
  interactive = true,
}: KanbanBoardProps) {
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);
  const moveStage = useKanbanMoveStage(queryKey);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const activeApplication = applications.find((application) => application.id === activeId) ?? null;
  const activeValidTargets = activeApplication
    ? validTargetStageIds(activeApplication.currentStage, sortedStages)
    : new Set<string>();

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const applicationId = String(active.id);
    const targetStageId = String(over.id);
    const application = applications.find((item) => item.id === applicationId);
    if (!application || targetStageId === application.currentStageId) return;

    const targets = validTargetStageIds(application.currentStage, sortedStages);
    if (!targets.has(targetStageId)) {
      toast.error("Can't move there — only the next stage or a terminal stage is allowed.");
      return;
    }

    const targetStage = sortedStages.find((stage) => stage.id === targetStageId);
    if (!targetStage) return;

    moveStage.mutate(
      { applicationId, stageId: targetStageId, targetStage },
      { onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not move stage.") },
    );
  }

  if (!interactive) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {sortedStages.map((stage) => (
          <StaticColumn
            key={stage.id}
            stage={stage}
            applications={applications.filter((application) => application.currentStageId === stage.id)}
            onCardClick={onCardClick}
            cardMeta={cardMeta}
          />
        ))}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {sortedStages.map((stage) => (
          <DroppableColumn
            key={stage.id}
            stage={stage}
            applications={applications.filter((application) => application.currentStageId === stage.id)}
            isDragging={!!activeId}
            isValidTarget={activeId ? activeValidTargets.has(stage.id) : false}
            isSourceColumn={activeApplication?.currentStageId === stage.id}
            onCardClick={onCardClick}
            cardMeta={cardMeta}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
        {activeApplication ? (
          <div className="w-72 rotate-2 scale-105 shadow-xl">
            <KanbanCard application={activeApplication} meta={cardMeta?.(activeApplication)} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function DroppableColumn({
  stage,
  applications,
  isDragging,
  isValidTarget,
  isSourceColumn,
  onCardClick,
  cardMeta,
}: {
  stage: JobStage;
  applications: Application[];
  isDragging: boolean;
  isValidTarget: boolean;
  isSourceColumn: boolean;
  onCardClick?: (application: Application) => void;
  cardMeta?: (application: Application) => React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const showInvalid = isDragging && !isValidTarget && !isSourceColumn;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col gap-2 rounded-xl border border-transparent p-2 transition-colors duration-150",
        isDragging && isValidTarget && "border-dashed border-[var(--viz-good)]/50 bg-[var(--viz-good)]/5",
        isOver && isValidTarget && "border-solid bg-[var(--viz-good)]/10",
        showInvalid && "opacity-40",
      )}
    >
      <ColumnHeader stage={stage} count={applications.length} />
      <div className="flex flex-col gap-2 min-h-[6px]">
        {applications.length === 0 && (
          <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">Empty</div>
        )}
        {applications.map((application) => (
          <DraggableCard
            key={application.id}
            application={application}
            onClick={onCardClick}
            meta={cardMeta?.(application)}
          />
        ))}
      </div>
    </div>
  );
}

function StaticColumn({
  stage,
  applications,
  onCardClick,
  cardMeta,
}: {
  stage: JobStage;
  applications: Application[];
  onCardClick?: (application: Application) => void;
  cardMeta?: (application: Application) => React.ReactNode;
}) {
  return (
    <div className="flex w-72 shrink-0 flex-col gap-2">
      <ColumnHeader stage={stage} count={applications.length} />
      <div className="flex flex-col gap-2">
        {applications.length === 0 && (
          <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">Empty</div>
        )}
        {applications.map((application) => (
          <button key={application.id} className="text-left" onClick={() => onCardClick?.(application)}>
            <KanbanCard application={application} meta={cardMeta?.(application)} />
          </button>
        ))}
      </div>
    </div>
  );
}

function ColumnHeader({ stage, count }: { stage: JobStage; count: number }) {
  return (
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-1.5">
        <span
          className={cn("size-1.5 rounded-full", stage.isTerminal ? "bg-[var(--viz-good)]" : "bg-[var(--viz-series-1)]")}
        />
        <p className="text-sm font-medium">{stage.name}</p>
      </div>
      <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{count}</span>
    </div>
  );
}

function DraggableCard({
  application,
  onClick,
  meta,
}: {
  application: Application;
  onClick?: (application: Application) => void;
  meta?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: application.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onClick?.(application)}
      className={cn("cursor-grab touch-none transition-opacity active:cursor-grabbing", isDragging && "opacity-30")}
    >
      <KanbanCard application={application} meta={meta} />
    </div>
  );
}
