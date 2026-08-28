"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { addDays, format } from "date-fns";
import type { EntryRow, SettingsRow } from "@/lib/types";
import {
  aggregateCalculations,
  calculateEntry,
  type EntryCalculation,
} from "@/lib/finance";
import {
  getLocalDateKey,
  getLocalMonthKey,
  getLocalMonthRange,
  getLocalWeekRange,
  getStartOfLocalWeek,
  isInHalfOpenRange,
  type DateRange,
} from "@/lib/datetime";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type ChartMode = "day" | "week" | "month";

export type ChartEntry = Pick<
  EntryRow,
  | "started_at"
  | "ended_at"
  | "gross_cents"
  | "tips_cents"
  | "miles"
  | "fuel_cost_cents"
>;

interface WeeklyNetChartProps {
  chartEntries: ChartEntry[];
  unavailable: boolean;
  settings: SettingsRow;
  mode: ChartMode;
  onModeChange: (mode: ChartMode) => void;
}

type PendingBucket = {
  key: string;
  date: Date;
  label: string;
  calculations: EntryCalculation[];
};

type Bucket = {
  key: string;
  date: Date;
  label: string;
  estimated_take_home_cents: number;
  hours: number;
};

function formatMoney(cents: number) {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function TakeHomeTooltip({
  active,
  label,
  payload,
}: TooltipContentProps<number, string>) {
  if (!active || !payload?.length) return null;

  const value = payload[0]?.value;
  if (typeof value !== "number") return null;

  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1 font-medium">{String(label)}</p>
      <p className="text-muted-foreground">Estimated take-home</p>
      <p className="font-semibold tabular-nums">{formatMoney(value)}</p>
    </div>
  );
}

function calculateChartEntry(entry: ChartEntry, settings: SettingsRow) {
  return calculateEntry({
    grossCents: entry.gross_cents,
    tipsCents: entry.tips_cents,
    fuelCostCents: entry.fuel_cost_cents,
    miles: Number(entry.miles),
    mileageRateCents: settings.mileage_rate_cents,
    taxRateBps: settings.tax_rate_bps,
    startedAtMilliseconds: new Date(entry.started_at).getTime(),
    endedAtMilliseconds: new Date(entry.ended_at).getTime(),
  });
}

function finalizeBuckets(buckets: Map<string, PendingBucket>): Bucket[] {
  return Array.from(buckets.values())
    .map((bucket) => {
      const totals = aggregateCalculations(bucket.calculations);
      return {
        key: bucket.key,
        date: bucket.date,
        label: bucket.label,
        estimated_take_home_cents: totals.estimatedTakeHomeCents,
        hours: totals.workedHours,
      };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export default function WeeklyNetChart({
  chartEntries,
  unavailable,
  settings,
  mode,
  onModeChange,
}: WeeklyNetChartProps) {
  const data = useMemo(() => {
    if (!chartEntries.length) return [] as Bucket[];

    const now = new Date();
    const buckets = new Map<string, PendingBucket>();
    let chartRange: DateRange;
    let getBucketKey: (startedAt: Date) => string;

    if (mode === "day") {
      chartRange = getLocalWeekRange(now);
      getBucketKey = getLocalDateKey;

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const date = addDays(chartRange.startInclusive, dayOffset);
        const key = getLocalDateKey(date);
        buckets.set(key, {
          key,
          date,
          label: format(date, "EEE d"),
          calculations: [],
        });
      }
    } else if (mode === "week") {
      const firstWeek = getLocalWeekRange(now, -7);
      const currentWeek = getLocalWeekRange(now);
      chartRange = {
        startInclusive: firstWeek.startInclusive,
        endExclusive: currentWeek.endExclusive,
      };
      getBucketKey = (startedAt) =>
        getLocalDateKey(getStartOfLocalWeek(startedAt));

      for (let weekOffset = -7; weekOffset <= 0; weekOffset++) {
        const week = getLocalWeekRange(now, weekOffset);
        const date = week.startInclusive;
        const key = getLocalDateKey(date);
        buckets.set(key, {
          key,
          date,
          label: `${format(date, "MMM d")}–${format(
            addDays(date, 6),
            "MMM d"
          )}`,
          calculations: [],
        });
      }
    } else {
      const firstMonth = getLocalMonthRange(now, -11);
      const currentMonth = getLocalMonthRange(now);
      chartRange = {
        startInclusive: firstMonth.startInclusive,
        endExclusive: currentMonth.endExclusive,
      };
      getBucketKey = getLocalMonthKey;

      for (let monthOffset = -11; monthOffset <= 0; monthOffset++) {
        const month = getLocalMonthRange(now, monthOffset);
        const date = month.startInclusive;
        const key = getLocalMonthKey(date);
        buckets.set(key, {
          key,
          date,
          label: format(date, "MMM yyyy"),
          calculations: [],
        });
      }
    }

    for (const entry of chartEntries) {
      const startedAt = new Date(entry.started_at);
      if (!isInHalfOpenRange(startedAt, chartRange)) continue;

      const bucket = buckets.get(getBucketKey(startedAt));
      if (!bucket) continue;
      bucket.calculations.push(calculateChartEntry(entry, settings));
    }

    return finalizeBuckets(buckets);
  }, [chartEntries, settings, mode]);

  return (
    <Card className="min-w-0">
      <CardHeader className="gap-4 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle>Profit trend</CardTitle>
          <CardDescription>
            Estimated take-home after fuel and your estimated tax reserve.
          </CardDescription>
        </div>
        <div
          className="grid shrink-0 grid-cols-3 rounded-lg border border-border bg-muted p-1"
          role="group"
          aria-label="Profit trend period"
        >
          {(["day", "week", "month"] as const).map((period) => (
            <button
              key={period}
              type="button"
              aria-pressed={mode === period}
              onClick={() => onModeChange(period)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-3 ${
                mode === period
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {period === "day"
                ? "Daily"
                : period === "week"
                  ? "Weekly"
                  : "Monthly"}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {unavailable || !data.length ? (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-6 text-center text-sm text-muted-foreground">
            {unavailable
              ? "Chart data is currently unavailable."
              : "No data yet for this view. Add entries to see your trend."}
          </div>
        ) : (
          <div
            className="h-64 w-full sm:h-72"
            role="img"
            aria-label={`Bar chart of estimated take-home by ${mode}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 12, right: 4, left: -12, bottom: 0 }}
                barCategoryGap="28%"
              >
                <CartesianGrid
                  vertical={false}
                  stroke="hsl(var(--border))"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={12}
                />
                <YAxis
                  tickFormatter={(value: number) =>
                    `$${(value / 100).toFixed(0)}`
                  }
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  width={54}
                  domain={[
                    (dataMin: number) => (dataMin < 0 ? dataMin * 1.1 : 0),
                    (dataMax: number) => (dataMax > 0 ? dataMax * 1.1 : 0),
                  ]}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
                  content={TakeHomeTooltip}
                  allowEscapeViewBox={{ x: false, y: false }}
                  offset={10}
                  wrapperStyle={{ zIndex: 10, pointerEvents: "none" }}
                />
                <Bar
                  dataKey="estimated_take_home_cents"
                  name="Estimated take-home"
                  fill="hsl(var(--primary))"
                  radius={[6, 6, 2, 2]}
                  maxBarSize={34}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
