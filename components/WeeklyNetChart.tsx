"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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

  if (unavailable) {
    return (
      <section className="rounded-3xl border bg-slate-100/90 p-4 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:p-5">
        Chart data is currently unavailable.
      </section>
    );
  }

  if (!data.length) {
    return (
      <section className="rounded-3xl border bg-slate-100/90 p-4 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:p-5">
        No data yet for this view. Add some entries or adjust your filters.
      </section>
    );
  }

  return (
    <section className="rounded-3xl border bg-slate-100/90 p-4 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Estimated take-home over time
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Bars show earnings after fuel and your estimated tax reserve.
            Mileage affects the taxable estimate, not cash profit.
          </p>
        </div>
      </div>

      <div
        className="h-64"
        role="img"
        aria-label={`Bar chart of estimated take-home by ${mode}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 16, left: 0, bottom: 4 }}
            barSize={32}
            barCategoryGap={24}
          >
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(148,163,184,0.5)" }}
            />
            <YAxis
              tickFormatter={(value: number) =>
                `$${(value / 100).toFixed(0)}`
              }
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(148,163,184,0.5)" }}
              domain={[
                (dataMin: number) => (dataMin < 0 ? dataMin * 1.1 : 0),
                (dataMax: number) => (dataMax > 0 ? dataMax * 1.1 : 0),
              ]}
            />
            <Tooltip
              cursor={{ fill: "rgba(148,163,184,0.12)" }}
              formatter={(value) => [
                typeof value === "number" ? formatMoney(value) : String(value),
                "Estimated take-home",
              ]}
              labelFormatter={(label) => String(label)}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid rgba(148,163,184,0.5)",
                fontSize: 12,
                backgroundColor: "#020617",
                color: "#e5e7eb",
              }}
            />
            <Bar
              dataKey="estimated_take_home_cents"
              name="Estimated take-home"
              fill="#0ea5e9"
              radius={[8, 8, 4, 4]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
