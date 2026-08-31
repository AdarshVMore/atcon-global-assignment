import { Badge } from "@/components/ui/badge";
import type { JobStatus } from "@/types/jobs";

const statusStyles: Record<JobStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PUBLISHED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  CLOSED: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge variant="secondary" className={statusStyles[status]}>
      {status}
    </Badge>
  );
}
