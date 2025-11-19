// components/WeeklyNetChart.tsx
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
import type { EntryRow, SettingsRow } from "@/lib/types";
import {
  durationHours,
  mileageDeductionCents,
  taxEstimateCents,
  netProfitCents,
} from "@/lib/utils";
import {
  addDays,
  format,
  startOfMonth,
  startOfWeek,
  parseISO,
} from "date-fns";

export type ChartMode = "day" | "week" | "month";

interface WeeklyNetChartProps {
  entries: EntryRow[];
  settings: SettingsRow;
  mode: ChartMode;
}

type Bucket = {
  key: string;
  date: Date;
  label: string;
  net_cents: number;
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

export default function WeeklyNetChart({
  entries,
  settings,
  mode,
}: WeeklyNetChartProps) {
  const data = useMemo(() => {
    if (!entries.length) return [] as Bucket[];

    const buckets = new Map<string, Bucket>();

    for (const e of entries) {
      const start = parseISO(e.started_at);
      let bucketDate: Date;

      if (mode === "day") {
        bucketDate = new Date(
          start.getFullYear(),
          start.getMonth(),
          start.getDate()
        );
      } else if (mode === "week") {
        bucketDate = startOfWeek(start, { weekStartsOn: 1 });
      } else {
        bucketDate = startOfMonth(start);
      }

      const key = bucketDate.toISOString();
      const label =
        mode === "day"
          ? format(bucketDate, "EEE d")
          : mode === "week"
          ? `${format(bucketDate, "MMM d")}–${format(
              addDays(bucketDate, 6),
              "MMM d"
            )}`
          : format(bucketDate, "MMM yyyy");

      if (!buckets.has(key)) {
        buckets.set(key, {
          key,
          date: bucketDate,
          label,
          net_cents: 0,
          hours: 0,
        });
      }

      const bucket = buckets.get(key)!;

      const miles = Number(e.miles || 0);
      const mileageDeduction = mileageDeductionCents(
        miles,
        settings.mileage_rate_cents
      );
      const tax = taxEstimateCents(
        e.gross_cents,
        mileageDeduction,
        e.fuel_cost_cents,
        settings.tax_rate_bps
      );
      const net = netProfitCents(e.gross_cents, e.fuel_cost_cents, tax);
      const hours = durationHours(e.started_at, e.ended_at);

      bucket.net_cents += net;
      bucket.hours += hours;
    }

    return Array.from(buckets.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );
  }, [entries, settings, mode]);

  if (!data.length) {
    return (
      <section className="rounded-3xl border bg-slate-100/90 p-4 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:p-5">
        No data yet for this view. Add some entries or adjust your filters.
      </section>
    );
  }

  return (
    <section className="rounded-3xl border bg-slate-100/90 p-4 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900 sm:p-5">
      <div className="mb-3">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          Net profit over time
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Bars show net after fuel, mileage, and your tax settings.
        </p>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(148,163,184,0.5)" }}
            />
            <YAxis
              tickFormatter={(v: number) => `$${(v / 100).toFixed(0)}`}
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(148,163,184,0.5)" }}
            />
            <Tooltip
              cursor={{ fill: "rgba(148,163,184,0.12)" }}
              formatter={(value: any, name: any) => {
                if (name === "net_cents") {
                  return [formatMoney(value as number), "Net"];
                }
                if (name === "hours") {
                  return [`${(value as number).toFixed(1)}h`, "Hours"];
                }
                return value;
              }}
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
              dataKey="net_cents"
              name="Net"
              fill="#0ea5e9" // sky-500
              radius={[8, 8, 4, 4]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
