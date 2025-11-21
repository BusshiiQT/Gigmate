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
  startOfMonth,
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

// Compute net & hours for any single entry
function computeEntryStats(e: EntryRow, settings: SettingsRow) {
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
  return { net_cents: net, hours };
}

export default function InsightsPanel({
  entries,
  settings,
  scope,
}: InsightsPanelProps) {
  if (!entries.length || !settings) return null;

  // --- 1. FILTER FOR CURRENT WEEK IF NEEDED ---
  let filtered = entries;
  const now = new Date();

  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = addDays(weekStart, 7);
  weekEnd.setHours(23, 59, 59, 999);

  if (scope === "week") {
    filtered = entries.filter((e) => {
      const d = parseISO(e.started_at);
      return !isBefore(d, weekStart) && !isAfter(d, weekEnd);
    });
    if (!filtered.length) return null;
  }

  // Convert all filtered entries to {net, hours}
  const perEntry = filtered.map((e) => ({
    entry: e,
    ...computeEntryStats(e, settings),
  }));

  const totalNet = perEntry.reduce((s, x) => s + x.net_cents, 0);
  const totalHours = perEntry.reduce((s, x) => s + x.hours, 0);
  const avgHourly =
    totalHours > 0 ? Math.round(totalNet / totalHours) : 0;

  const best = perEntry.reduce(
    (best, curr) =>
      !best || curr.net_cents > best.net_cents ? curr : best,
    null as (typeof perEntry)[number] | null
  );

  // --- 2. WEEK VS LAST WEEK ---
  const lastWeekStart = addDays(weekStart, -7);
  const lastWeekEnd = addDays(weekStart, 0);

  const lastWeekEntries = entries.filter((e) => {
    const d = parseISO(e.started_at);
    return !isBefore(d, lastWeekStart) && !isAfter(d, lastWeekEnd);
  });

  const lastWeekStats = lastWeekEntries.map((e) =>
    computeEntryStats(e, settings)
  );
  const lastWeekNet = lastWeekStats.reduce((s, x) => s + x.net_cents, 0);

  const weekDiff = totalNet - lastWeekNet;
  const weekPct =
    lastWeekNet > 0 ? (weekDiff / lastWeekNet) * 100 : null;

  // --- 3. TOP PLATFORM THIS MONTH ---
  const monthStart = startOfMonth(now);

  const monthEntries = entries.filter(
    (e) => parseISO(e.started_at) >= monthStart
  );

  const profitByPlatform = new Map<string, number>();
  for (const e of monthEntries) {
    const { net_cents } = computeEntryStats(e, settings);
    profitByPlatform.set(
      e.platform,
      (profitByPlatform.get(e.platform) || 0) + net_cents
    );
  }

  let topPlatform: { platform: string; net: number } | null = null;
  for (const [p, net] of profitByPlatform.entries()) {
    if (!topPlatform || net > topPlatform.net) {
      topPlatform = { platform: p, net };
    }
  }

  return (
    <section className="rounded-3xl border bg-slate-100/90 p-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
        Insights
      </h2>

      <ul className="mt-3 space-y-1.5 text-slate-700 dark:text-slate-200">
        {/* TOTAL NET */}
        <li>
          <span className="font-medium">Total net {scope === "week" ? "this week" : ""}:</span>{" "}
          {formatMoney(totalNet)}{" "}
          {totalHours > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ({totalHours.toFixed(1)} hrs • {formatMoney(avgHourly)} / hr)
            </span>
          )}
        </li>

        {/* BEST DAY */}
        {best && (
          <li>
            <span className="font-medium">Best earning day:</span>{" "}
            {format(parseISO(best.entry.started_at), "EEE MMM d")} —{" "}
            {formatMoney(best.net_cents)} net.
          </li>
        )}

        {/* WEEK VS LAST WEEK */}
        {scope === "week" && (
          <li>
            <span className="font-medium">Week-over-week change:</span>{" "}
            {weekDiff >= 0 ? "+" : ""}
            {formatMoney(weekDiff)}{" "}
            {weekPct !== null && (
              <span
                className={`text-xs ${
                  weekPct >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                ({weekPct.toFixed(1)}%)
              </span>
            )}
          </li>
        )}

        {/* TOP PLATFORM MONTH */}
        {topPlatform && (
          <li>
            <span className="font-medium">Top platform this month:</span>{" "}
            {topPlatform.platform} ({formatMoney(topPlatform.net)})
          </li>
        )}

        {/* GENERAL TIP */}
        <li className="pt-1 text-slate-600 dark:text-slate-400">
          Compare platforms on your high-profit days to see where your hourly is strongest.
        </li>
      </ul>
    </section>
  );
}
