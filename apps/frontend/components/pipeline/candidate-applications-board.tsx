import { cn } from "@/lib/utils";
import type { Application } from "@/types/applications";

interface StageColumn {
  name: string;
  order: number;
  isTerminal: boolean;
  applications: Application[];
}

function groupByStageName(applications: Application[]): StageColumn[] {
  const columns = new Map<string, StageColumn>();

  for (const application of applications) {
    const { name, order, isTerminal } = application.currentStage;
    const existing = columns.get(name);
    if (existing) {
      existing.applications.push(application);
    } else {
      columns.set(name, { name, order, isTerminal, applications: [application] });
    }
  }

  return [...columns.values()].sort((a, b) => a.order - b.order);
}

export function CandidateApplicationsBoard({
  applications,
  onCardClick,
}: {
  applications: Application[];
  onCardClick: (application: Application) => void;
}) {
  const columns = groupByStageName(applications);

  if (columns.length === 0) {
    return <p className="text-sm text-muted-foreground">You haven&apos;t applied to anything yet.</p>;
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => (
        <div key={column.name} className="flex w-72 shrink-0 flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  column.isTerminal ? "bg-[var(--viz-good)]" : "bg-[var(--viz-series-1)]",
                )}
              />
              <p className="text-sm font-medium">{column.name}</p>
            </div>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {column.applications.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {column.applications.map((application) => (
              <button key={application.id} className="text-left" onClick={() => onCardClick(application)}>
                <div className="rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
                  <p className="truncate text-sm font-medium">{application.job.title}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Applied {new Date(application.appliedAt).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
