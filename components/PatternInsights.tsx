"use client";

import type { EntryRow, SettingsRow } from "@/lib/types";
import {
  aggregateCalculations,
  calculateEntry,
  type EntryCalculation,
} from "@/lib/finance";
import {
  getRecentLocalDaysRange,
  isInHalfOpenRange,
} from "@/lib/datetime";

export type PatternEntry = Pick<
  EntryRow,
  | "platform"
  | "started_at"
  | "ended_at"
  | "gross_cents"
  | "tips_cents"
  | "miles"
  | "fuel_cost_cents"
>;

interface PatternInsightsProps {
  patternEntries: PatternEntry[];
  unavailable: boolean;
  settings: SettingsRow | null;
}

function formatMoney(cents: number) {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

type DayBucket = {
  label: string;
  calculations: EntryCalculation[];
};

type TimeBucket = {
  key: string;
  label: string;
  startHour: number;
  endHour: number;
  calculations: EntryCalculation[];
};

function calculatePatternEntry(entry: PatternEntry, settings: SettingsRow) {
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

export default function PatternInsights({
  patternEntries,
  unavailable,
  settings,
}: PatternInsightsProps) {
  if (unavailable) {
    return (
      <section className="rounded-3xl border bg-slate-100/90 p-4 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:p-5">
        Pattern insights are currently unavailable.
      </section>
    );
  }

  if (!patternEntries.length || !settings) return null;

  const analysisRange = getRecentLocalDaysRange(new Date(), 30);
  const recent = patternEntries
    .map((entry) => ({
      entry,
      startedAt: new Date(entry.started_at),
    }))
    .filter(({ startedAt }) => isInHalfOpenRange(startedAt, analysisRange))
    .map(({ entry, startedAt }) => ({
      entry,
      startedAt,
      calculation: calculatePatternEntry(entry, settings),
    }));

  if (!recent.length) return null;

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayBuckets: DayBucket[] = dayLabels.map((label) => ({
    label,
    calculations: [],
  }));

  for (const { startedAt, calculation } of recent) {
    dayBuckets[startedAt.getDay()].calculations.push(calculation);
  }

  let bestDay: { label: string; hourlyCents: number } | null = null;
  for (const bucket of dayBuckets) {
    const totals = aggregateCalculations(bucket.calculations);
    if (totals.workedMilliseconds <= 0) continue;
    if (!bestDay || totals.estimatedHourlyRateCents > bestDay.hourlyCents) {
      bestDay = {
        label: bucket.label,
        hourlyCents: totals.estimatedHourlyRateCents,
      };
    }
  }

  const timeBuckets: TimeBucket[] = [
    {
      key: "morning",
      label: "Morning (5–11 AM)",
      startHour: 5,
      endHour: 11,
      calculations: [],
    },
    {
      key: "afternoon",
      label: "Afternoon (11 AM–5 PM)",
      startHour: 11,
      endHour: 17,
      calculations: [],
    },
    {
      key: "evening",
      label: "Evening (5–10 PM)",
      startHour: 17,
      endHour: 22,
      calculations: [],
    },
    {
      key: "late",
      label: "Late night (10 PM–5 AM)",
      startHour: 22,
      endHour: 29,
      calculations: [],
    },
  ];

  for (const { startedAt, calculation } of recent) {
    const hour = startedAt.getHours();
    for (const bucket of timeBuckets) {
      const comparableHour =
        hour < 5 && bucket.key === "late" ? hour + 24 : hour;
      if (
        comparableHour >= bucket.startHour &&
        comparableHour < bucket.endHour
      ) {
        bucket.calculations.push(calculation);
        break;
      }
    }
  }

  let bestTime: { label: string; hourlyCents: number } | null = null;
  for (const bucket of timeBuckets) {
    const totals = aggregateCalculations(bucket.calculations);
    if (totals.workedMilliseconds <= 0) continue;
    if (!bestTime || totals.estimatedHourlyRateCents > bestTime.hourlyCents) {
      bestTime = {
        label: bucket.label,
        hourlyCents: totals.estimatedHourlyRateCents,
      };
    }
  }

  const weekendByPlatform = new Map<string, EntryCalculation[]>();
  for (const { entry, startedAt, calculation } of recent) {
    const dayOfWeek = startedAt.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) continue;

    const calculations = weekendByPlatform.get(entry.platform) ?? [];
    calculations.push(calculation);
    weekendByPlatform.set(entry.platform, calculations);
  }

  let bestWeekendPlatform:
    | { platform: string; hourlyCents: number; hours: number }
    | null = null;
  for (const [platform, calculations] of weekendByPlatform.entries()) {
    const totals = aggregateCalculations(calculations);
    if (totals.workedMilliseconds <= 0) continue;
    if (
      !bestWeekendPlatform ||
      totals.estimatedHourlyRateCents > bestWeekendPlatform.hourlyCents
    ) {
      bestWeekendPlatform = {
        platform,
        hourlyCents: totals.estimatedHourlyRateCents,
        hours: totals.workedHours,
      };
    }
  }

  if (!bestDay && !bestTime && !bestWeekendPlatform) return null;

  return (
    <section className="rounded-3xl border bg-slate-100/90 p-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
        Patterns (last 30 days)
      </h2>

      <ul className="mt-3 space-y-1.5 text-slate-700 dark:text-slate-200">
        {bestDay && (
          <li>
            <span className="font-medium">Best day for hourly:</span>{" "}
            {bestDay.label} with {formatMoney(bestDay.hourlyCents)}/hr.
          </li>
        )}

        {bestTime && (
          <li>
            <span className="font-medium">Best time window:</span>{" "}
            {bestTime.label} — around {formatMoney(bestTime.hourlyCents)}/hr on
            average.
          </li>
        )}

        {bestWeekendPlatform && (
          <li>
            <span className="font-medium">Weekend standout:</span>{" "}
            {bestWeekendPlatform.platform} on Sat/Sun, about{" "}
            {formatMoney(bestWeekendPlatform.hourlyCents)}/hr over{" "}
            {bestWeekendPlatform.hours.toFixed(1)} hrs.
          </li>
        )}

        <li className="pt-1 text-slate-600 dark:text-slate-400">
          Use these patterns to plan your next week: lean into the days, times,
          and apps where your hourly is strongest.
        </li>
      </ul>
    </section>
  );
}
