// components/InsightsPanel.tsx
"use client";

import type { EntryRow, SettingsRow } from "@/lib/types";
import {
  aggregateCalculations,
  calculateEntry,
  type EntryCalculation,
} from "@/lib/finance";
import {
  getLocalDateKey,
  getLocalMonthRange,
  getLocalWeekRange,
  isInHalfOpenRange,
} from "@/lib/datetime";
import { format } from "date-fns";

type Scope = "week" | "all";

export type InsightEntry = Pick<
  EntryRow,
  | "platform"
  | "started_at"
  | "ended_at"
  | "gross_cents"
  | "tips_cents"
  | "miles"
  | "fuel_cost_cents"
>;

interface InsightsPanelProps {
  displayEntries: InsightEntry[];
  analyticalEntries: InsightEntry[];
  analyticsUnavailable: boolean;
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

function calculateInsightEntry(e: InsightEntry, settings: SettingsRow) {
  return calculateEntry({
    grossCents: e.gross_cents,
    tipsCents: e.tips_cents,
    fuelCostCents: e.fuel_cost_cents,
    miles: Number(e.miles),
    mileageRateCents: settings.mileage_rate_cents,
    taxRateBps: settings.tax_rate_bps,
    startedAtMilliseconds: new Date(e.started_at).getTime(),
    endedAtMilliseconds: new Date(e.ended_at).getTime(),
  });
}

export default function InsightsPanel({
  displayEntries,
  analyticalEntries,
  analyticsUnavailable,
  settings,
  scope,
}: InsightsPanelProps) {
  if (!displayEntries.length || !settings) return null;

  let filtered = displayEntries;
  const now = new Date();

  if (scope === "week") {
    const currentWeek = getLocalWeekRange(now);
    filtered = displayEntries.filter((entry) =>
      isInHalfOpenRange(new Date(entry.started_at), currentWeek)
    );
    if (!filtered.length) return null;
  }

  const perEntry = filtered.map((e) => ({
    entry: e,
    calculation: calculateInsightEntry(e, settings),
  }));
  const totals = aggregateCalculations(
    perEntry.map(({ calculation }) => calculation)
  );

  const calculationsByDay = new Map<
    string,
    { date: Date; calculations: EntryCalculation[] }
  >();
  for (const { entry, calculation } of perEntry) {
    const date = new Date(entry.started_at);
    const key = getLocalDateKey(date);
    const day = calculationsByDay.get(key) ?? { date, calculations: [] };
    day.calculations.push(calculation);
    calculationsByDay.set(key, day);
  }

  let bestDay: { date: Date; estimatedTakeHomeCents: number } | null = null;
  for (const day of calculationsByDay.values()) {
    const dayTotals = aggregateCalculations(day.calculations);
    if (
      !bestDay ||
      dayTotals.estimatedTakeHomeCents > bestDay.estimatedTakeHomeCents
    ) {
      bestDay = {
        date: day.date,
        estimatedTakeHomeCents: dayTotals.estimatedTakeHomeCents,
      };
    }
  }

  let weekComparison: { differenceCents: number; percentage: number | null } | null =
    null;
  let topPlatform: { platform: string; estimatedTakeHomeCents: number } | null =
    null;

  if (!analyticsUnavailable) {
    const currentWeek = getLocalWeekRange(now);
    const previousWeek = getLocalWeekRange(now, -1);
    const currentWeekCalculations: EntryCalculation[] = [];
    const previousWeekCalculations: EntryCalculation[] = [];
    const calculationsByPlatform = new Map<string, EntryCalculation[]>();
    const currentMonth = getLocalMonthRange(now);

    for (const entry of analyticalEntries) {
      const startedAt = new Date(entry.started_at);
      const calculation = calculateInsightEntry(entry, settings);

      if (isInHalfOpenRange(startedAt, currentWeek)) {
        currentWeekCalculations.push(calculation);
      } else if (isInHalfOpenRange(startedAt, previousWeek)) {
        previousWeekCalculations.push(calculation);
      }

      if (!isInHalfOpenRange(startedAt, currentMonth)) {
        continue;
      }

      const calculations = calculationsByPlatform.get(entry.platform) ?? [];
      calculations.push(calculation);
      calculationsByPlatform.set(entry.platform, calculations);
    }

    const currentWeekTotals = aggregateCalculations(currentWeekCalculations);
    const previousWeekTotals = aggregateCalculations(previousWeekCalculations);
    const differenceCents =
      currentWeekTotals.estimatedTakeHomeCents -
      previousWeekTotals.estimatedTakeHomeCents;
    weekComparison = {
      differenceCents,
      percentage:
        previousWeekTotals.estimatedTakeHomeCents > 0
          ? (differenceCents /
              previousWeekTotals.estimatedTakeHomeCents) *
            100
          : null,
    };

    for (const [platform, calculations] of calculationsByPlatform.entries()) {
      const estimatedTakeHomeCents = aggregateCalculations(
        calculations
      ).estimatedTakeHomeCents;
      if (
        !topPlatform ||
        estimatedTakeHomeCents > topPlatform.estimatedTakeHomeCents
      ) {
        topPlatform = { platform, estimatedTakeHomeCents };
      }
    }
  }

  return (
    <section className="rounded-3xl border bg-slate-100/90 p-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
        Insights
      </h2>

      <ul className="mt-3 space-y-1.5 text-slate-700 dark:text-slate-200">
        <li>
          <span className="font-medium">
            Estimated take-home {scope === "week" ? "this week" : ""}:
          </span>{" "}
          {formatMoney(totals.estimatedTakeHomeCents)}{" "}
          {totals.workedMilliseconds > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ({totals.workedHours.toFixed(1)} hrs •{" "}
              {formatMoney(totals.estimatedHourlyRateCents)} / hr)
            </span>
          )}
        </li>

        {bestDay && (
          <li>
            <span className="font-medium">Best earning day:</span>{" "}
            {format(bestDay.date, "EEE MMM d")} —{" "}
            {formatMoney(bestDay.estimatedTakeHomeCents)} estimated take-home.
          </li>
        )}

        {scope === "week" && weekComparison && (
          <li>
            <span className="font-medium">Week-over-week change:</span>{" "}
            {weekComparison.differenceCents >= 0 ? "+" : ""}
            {formatMoney(weekComparison.differenceCents)}{" "}
            {weekComparison.percentage !== null && (
              <span
                className={`text-xs ${
                  weekComparison.percentage >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                ({weekComparison.percentage.toFixed(1)}%)
              </span>
            )}
          </li>
        )}

        {topPlatform && (
          <li>
            <span className="font-medium">Top platform this month:</span>{" "}
            {topPlatform.platform} (
            {formatMoney(topPlatform.estimatedTakeHomeCents)})
          </li>
        )}

        {analyticsUnavailable && (
          <li className="text-slate-600 dark:text-slate-400">
            Week-over-week and monthly insights are currently unavailable.
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
