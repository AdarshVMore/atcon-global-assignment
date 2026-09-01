import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Application } from "@/types/applications";

function scoreTone(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 70) return "text-[var(--viz-good)]";
  if (score >= 40) return "text-[var(--viz-warning)]";
  return "text-muted-foreground";
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

interface KanbanCardProps {
  application: Application;
  name?: string;
  meta?: React.ReactNode;
}

export function KanbanCard({ application, name, meta }: KanbanCardProps) {
  const displayName = name ?? `Candidate ${application.candidateId.slice(0, 8)}`;
  const avatarInitials = name ? initials(name) : application.candidateId.slice(0, 2).toUpperCase();

  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2.5">
        <Avatar size="sm" className="shrink-0">
          <AvatarFallback className="text-[10px] font-medium">{avatarInitials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{application.job.title}</p>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {new Date(application.appliedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </span>
        {application.rankingScore !== null && (
          <span className={cn("font-mono text-xs font-semibold tabular-nums", scoreTone(application.rankingScore))}>
            {Math.round(application.rankingScore)}
          </span>
        )}
      </div>
      {meta && <div className="mt-2 border-t pt-2">{meta}</div>}
    </div>
  );
}
