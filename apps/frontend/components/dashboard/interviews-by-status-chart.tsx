"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const STATUS_META: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: "Scheduled", color: "var(--viz-series-1)" },
  RESCHEDULED: { label: "Rescheduled", color: "var(--viz-warning)" },
  COMPLETED: { label: "Completed", color: "var(--viz-good)" },
  CANCELLED: { label: "Cancelled", color: "var(--viz-critical)" },
};

const STATUS_ORDER = ["SCHEDULED", "RESCHEDULED", "COMPLETED", "CANCELLED"];

interface StatusDatum {
  status: string;
  label: string;
  count: number;
  color: string;
}

interface TooltipPayloadItem {
  payload: StatusDatum;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const datum = payload[0]?.payload;
  if (!datum) return null;
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">{datum.label}</p>
      <p className="text-muted-foreground">
        {datum.count} interview{datum.count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export function InterviewsByStatusChart({ counts }: { counts: Record<string, number> }) {
  const data: StatusDatum[] = STATUS_ORDER.filter((status) => (counts[status] ?? 0) > 0).map((status) => ({
    status,
    label: STATUS_META[status]?.label ?? status,
    count: counts[status] ?? 0,
    color: STATUS_META[status]?.color ?? "var(--viz-series-1)",
  }));

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No interviews scheduled yet.</p>;
  }

  const height = Math.max(data.length * 34 + 20, 100);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 28, bottom: 4, left: 4 }} barCategoryGap={10}>
        <CartesianGrid horizontal={false} stroke="var(--viz-grid)" />
        <XAxis type="number" hide allowDecimals={false} domain={[0, "dataMax"]} />
        <YAxis
          type="category"
          dataKey="label"
          axisLine={{ stroke: "var(--viz-axis)" }}
          tickLine={false}
          tick={{ fill: "var(--viz-ink-secondary)", fontSize: 12.5 }}
          width={92}
        />
        <Tooltip cursor={{ fill: "var(--viz-grid)" }} content={<ChartTooltip />} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {data.map((entry) => (
            <Cell key={entry.status} fill={entry.color} />
          ))}
          <LabelList dataKey="count" position="right" style={{ fill: "var(--viz-ink-secondary)", fontSize: 12.5 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
