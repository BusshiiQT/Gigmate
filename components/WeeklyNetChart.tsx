"use client";

import { useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import type { EntryRow, SettingsRow } from "@/lib/types";
import {
  durationHours,
  mileageDeductionCents,
  taxEstimateCents,
  netProfitCents,
} from "@/lib/utils";
import { startOfWeek, endOfWeek, format, eachWeekOfInterval } from "date-fns";

export default function WeeklyNetChart({
  entries,
  settings,
  weeksBack = 8,
}: {
  entries: EntryRow[];
  settings: SettingsRow;
  weeksBack?: number;
}) {
  const data = useMemo(() => {
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    const start = startOfWeek(
      new Date(end.getTime() - weeksBack * 7 * 24 * 3600 * 1000),
      { weekStartsOn: 1 }
    );

    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });

    // bucket by week label
    const buckets = weeks.map((w) => ({
      label: format(w, "MM/dd"),
      gross: 0,
      fuel: 0,
      miles: 0,
      hours: 0,
    }));

    // assign entries to week they START in
    for (const e of entries) {
      const d = new Date(e.started_at);
      const idx = weeks.findIndex((w, i) => {
        const wStart = w;
        const wEnd = new Date((i + 1 < weeks.length ? weeks[i + 1] : end).getTime() - 1);
        return d >= wStart && d <= wEnd;
      });
      if (idx >= 0) {
        buckets[idx].gross += e.gross_cents;
        buckets[idx].fuel += e.fuel_cost_cents;
        buckets[idx].miles += Number(e.miles || 0);
        buckets[idx].hours += durationHours(e.started_at, e.ended_at);
      }
    }

    // compute net
    return buckets.map((b) => {
      const md = mileageDeductionCents(b.miles, settings.mileage_rate_cents);
      const tax = taxEstimateCents(b.gross, md, b.fuel, settings.tax_rate_bps);
      const net = netProfitCents(b.gross, b.fuel, tax);
      return { label: b.label, net: Math.max(0, Math.round(net / 100)) }; // dollars for axis readability
    });
  }, [entries, settings, weeksBack]);

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="mb-3 text-sm font-medium">Weekly Net Profit (last {weeksBack} weeks)</div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="net" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
