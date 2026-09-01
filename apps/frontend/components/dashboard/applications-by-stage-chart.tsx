"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StageApplicationCount } from "@/types/dashboard";

const SEQUENTIAL_STEPS = ["var(--viz-seq-250)", "var(--viz-seq-350)", "var(--viz-seq-450)", "var(--viz-seq-550)"];

interface AggregatedStage {
  stageName: string;
  count: number;
}

interface TooltipPayloadItem {
  payload: AggregatedStage;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const stage = payload[0]?.payload;
  if (!stage) return null;
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">{stage.stageName}</p>
      <p className="text-muted-foreground">
        {stage.count} application{stage.count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

// Different jobs each have their own stage rows even when the names match
// (e.g. every job's own "Applied" stage), so the backend's per-job breakdown
// arrives with repeated names — sum by name here rather than plot one bar
// per (job, stage) pair.
function aggregateByStageName(stages: StageApplicationCount[]): AggregatedStage[] {
  const totals = new Map<string, number>();
  for (const stage of stages) {
    totals.set(stage.stageName, (totals.get(stage.stageName) ?? 0) + stage.count);
  }
  return [...totals.entries()].map(([stageName, count]) => ({ stageName, count }));
}

export function ApplicationsByStageChart({ stages }: { stages: StageApplicationCount[] }) {
  const data = useMemo(() => aggregateByStageName(stages), [stages]);

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No applications yet.</p>;
  }

  const height = Math.max(data.length * 34 + 20, 100);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 28, bottom: 4, left: 4 }} barCategoryGap={10}>
        <CartesianGrid horizontal={false} stroke="var(--viz-grid)" />
        <XAxis type="number" hide allowDecimals={false} domain={[0, "dataMax"]} />
        <YAxis
          type="category"
          dataKey="stageName"
          axisLine={{ stroke: "var(--viz-axis)" }}
          tickLine={false}
          tick={{ fill: "var(--viz-ink-secondary)", fontSize: 12.5 }}
          width={100}
        />
        <Tooltip cursor={{ fill: "var(--viz-grid)" }} content={<ChartTooltip />} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {data.map((stage, index) => (
            <Cell key={stage.stageName} fill={SEQUENTIAL_STEPS[index % SEQUENTIAL_STEPS.length]} />
          ))}
          <LabelList dataKey="count" position="right" style={{ fill: "var(--viz-ink-secondary)", fontSize: 12.5 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
