import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface JobCardProps {
  href: string;
  title: string;
  description: string;
  relevance?: number;
}

export function JobCard({ href, title, description, relevance }: JobCardProps) {
  return (
    <Link href={href}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="flex h-full flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium leading-snug">{title}</p>
            {relevance !== undefined && relevance > 0 && (
              <Badge variant="outline" className="shrink-0 font-mono text-[10px] tabular-nums">
                {relevance}% match
              </Badge>
            )}
          </div>
          <p className="line-clamp-3 text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
