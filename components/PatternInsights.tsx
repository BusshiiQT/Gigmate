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
import { CalendarClock, CalendarDays, Trophy } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

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
      <Card>
        <CardContent className="p-5 text-sm text-muted-foreground">
          Pattern insights are currently unavailable.
        </CardContent>
      </Card>
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

  const patterns = [
    ...(bestDay
      ? [{ label: "Best day", value: bestDay.label, detail: `${formatMoney(bestDay.hourlyCents)}/hr`, icon: CalendarDays }]
      : []),
    ...(bestTime
      ? [{ label: "Best time", value: bestTime.label, detail: `${formatMoney(bestTime.hourlyCents)}/hr average`, icon: CalendarClock }]
      : []),
    ...(bestWeekendPlatform
      ? [{ label: "Weekend standout", value: bestWeekendPlatform.platform, detail: `${formatMoney(bestWeekendPlatform.hourlyCents)}/hr over ${bestWeekendPlatform.hours.toFixed(1)} hrs`, icon: Trophy }]
      : []),
  ];

  return (
    <Card aria-labelledby="patterns-heading">
        <CardHeader className="pb-3">
          <h2
            id="patterns-heading"
            className="text-base font-semibold leading-none tracking-tight"
          >
            Patterns
          </h2>
          <CardDescription>Based on your last 30 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {patterns.map(({ label, value, detail, icon: Icon }) => (
              <div key={label} className="flex min-w-0 gap-3">
                <span className="mt-0.5 rounded-lg bg-blue-50 p-2 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <p className="mt-1 font-semibold">{value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">{detail}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 border-t pt-3 text-sm text-muted-foreground">
            Use these patterns to plan your next week: lean into the days,
            times, and apps where your hourly is strongest.
          </p>
        </CardContent>
    </Card>
  );
}
