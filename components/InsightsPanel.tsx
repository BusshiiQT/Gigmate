// components/InsightsPanel.tsx
"use client";

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
  isAfter,
  isBefore,
  parseISO,
  startOfWeek,
} from "date-fns";

type Scope = "week" | "all";

interface InsightsPanelProps {
  entries: EntryRow[];
  settings: SettingsRow | null;
  scope: Scope;
}

function formatMoney(cents: number) {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export default function InsightsPanel({
  entries,
  settings,
  scope,
}: InsightsPanelProps) {
  if (!entries.length || !settings) return null;

  let filtered = entries;

  if (scope === "week") {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = addDays(weekStart, 7);
    weekEnd.setHours(23, 59, 59, 999);

    filtered = entries.filter((e) => {
      const d = parseISO(e.started_at);
      return !isBefore(d, weekStart) && !isAfter(d, weekEnd);
    });

    if (!filtered.length) return null;
  }

  const perEntry = filtered.map((e) => {
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
    return { entry: e, net_cents: net, hours };
  });

  const totalNet = perEntry.reduce((s, x) => s + x.net_cents, 0);
  const totalHours = perEntry.reduce((s, x) => s + x.hours, 0);
  const avgHourly =
    totalHours > 0 ? Math.round(totalNet / totalHours) : 0;

  const best = perEntry.reduce(
    (best, curr) =>
      !best || curr.net_cents > best.net_cents ? curr : best,
    null as (typeof perEntry)[number] | null
  );

  const labelScope =
    scope === "week" ? "this week" : "for the selected range";

  return (
    <section className="rounded-3xl border bg-slate-100/90 p-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
        Insights {scope === "week" ? "(this week)" : ""}
      </h2>
      <ul className="mt-3 space-y-1.5 text-slate-700 dark:text-slate-200">
        <li>
          <span className="font-medium">Net profit {labelScope}:</span>{" "}
          {formatMoney(totalNet)}{" "}
          {totalHours > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ({totalHours.toFixed(1)} hrs •{" "}
              {formatMoney(avgHourly)} / hr)
            </span>
          )}
        </li>

        {best && (
          <li>
            <span className="font-medium">Best earning day:</span>{" "}
            {format(parseISO(best.entry.started_at), "EEE MMM d")} with{" "}
            {formatMoney(best.net_cents)} net.
          </li>
        )}

        <li>
          <span className="font-medium">Tip:</span>{" "}
          Compare platforms on your best days to see where your hourly is
          highest.
        </li>
      </ul>
    </section>
  );
}
