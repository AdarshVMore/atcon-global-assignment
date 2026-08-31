import { Badge } from "@/components/ui/badge";
import type { InterviewStatus } from "@/types/interviews";

const statusStyles: Record<InterviewStatus, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  RESCHEDULED: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  CANCELLED: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

export function InterviewStatusBadge({ status }: { status: InterviewStatus }) {
  return (
    <Badge variant="secondary" className={statusStyles[status]}>
      {status}
    </Badge>
  );
}
