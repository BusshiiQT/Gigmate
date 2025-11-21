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
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
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

    const now = new Date();
    const buckets = new Map<string, Bucket>();

    if (mode === "day") {
      // 📊 DAILY: always show the current week (Mon–Sun),
      // even if some days have no entries.
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });

      // Pre-create 7 buckets (Mon–Sun)
      for (let i = 0; i < 7; i++) {
        const d = addDays(weekStart, i);
        const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
        buckets.set(key, {
          key,
          date: d,
          label: format(d, "EEE d"),
          net_cents: 0,
          hours: 0,
        });
      }

      // Add entries into the right day bucket (if within this week)
      for (const e of entries) {
        const started = parseISO(e.started_at);
        const bucketDate = new Date(
          started.getFullYear(),
          started.getMonth(),
          started.getDate()
        );
        const key = bucketDate.toISOString().slice(0, 10);
        const bucket = buckets.get(key);
        if (!bucket) continue; // outside current week

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

      return Array.from(buckets.values());
    }

    // Helper to add/update a bucket for week or month
    const addToBucket = (bucketDate: Date, entry: EntryRow) => {
      const key = bucketDate.toISOString().slice(0, 10);
      if (!buckets.has(key)) {
        const label =
          mode === "week"
            ? `${format(bucketDate, "MMM d")}–${format(
                addDays(bucketDate, 6),
                "MMM d"
              )}`
            : format(bucketDate, "MMM yyyy");

        buckets.set(key, {
          key,
          date: bucketDate,
          label,
          net_cents: 0,
          hours: 0,
        });
      }

      const bucket = buckets.get(key)!;

      const miles = Number(entry.miles || 0);
      const mileageDeduction = mileageDeductionCents(
        miles,
        settings.mileage_rate_cents
      );
      const tax = taxEstimateCents(
        entry.gross_cents,
        mileageDeduction,
        entry.fuel_cost_cents,
        settings.tax_rate_bps
      );
      const net = netProfitCents(
        entry.gross_cents,
        entry.fuel_cost_cents,
        tax
      );
      const hours = durationHours(entry.started_at, entry.ended_at);

      bucket.net_cents += net;
      bucket.hours += hours;
    };

    if (mode === "week") {
      // 📊 WEEKLY: last 8 weeks
      const cutoff = subWeeks(now, 7);
      for (const e of entries) {
        const started = parseISO(e.started_at);
        if (started < cutoff) continue;
        const bucketDate = startOfWeek(started, { weekStartsOn: 1 });
        addToBucket(bucketDate, e);
      }
    } else {
      // 📊 MONTHLY: last 12 months
      const cutoff = subMonths(now, 11);
      for (const e of entries) {
        const started = parseISO(e.started_at);
        if (started < cutoff) continue;
        const bucketDate = startOfMonth(started);
        addToBucket(bucketDate, e);
      }
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
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Net profit over time
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Bars show net after fuel, mileage, and your tax settings.
          </p>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 16, left: 0, bottom: 4 }}
          >
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#64748b" }} // slate-500
              tickLine={false}
              axisLine={{ stroke: "rgba(148,163,184,0.5)" }}
            />
            <YAxis
              tickFormatter={(v: number) => `$${(v / 100).toFixed(0)}`}
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(148,163,184,0.5)" }}
              domain={[0, (dataMax: number) => dataMax * 1.1]}
            />
            <Tooltip
              cursor={{ fill: "rgba(148,163,184,0.12)" }}
              formatter={(value: any, name: any) => {
                if (name === "net_cents")
                  return [formatMoney(value as number), "Net"];
                if (name === "hours")
                  return [`${(value as number).toFixed(1)}h`, "Hours"];
                return value;
              }}
              labelFormatter={(label) => String(label)}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid rgba(148,163,184,0.5)",
                fontSize: 12,
                backgroundColor: "#020617", // slate-950
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
