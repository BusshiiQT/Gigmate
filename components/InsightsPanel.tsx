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
import {
  CalendarDays,
  CircleDollarSign,
  TrendingUp,
  Trophy,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

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

  const insights = [
    {
      label: scope === "week" ? "Take-home this week" : "Take-home",
      value: formatMoney(totals.estimatedTakeHomeCents),
      detail:
        totals.workedMilliseconds > 0
          ? `${totals.workedHours.toFixed(1)} hrs · ${formatMoney(totals.estimatedHourlyRateCents)}/hr`
          : "Estimated after fuel and tax reserve",
      icon: CircleDollarSign,
      tone: "text-foreground",
    },
    ...(bestDay
      ? [
          {
            label: "Best earning day",
            value: format(bestDay.date, "EEE, MMM d"),
            detail: `${formatMoney(bestDay.estimatedTakeHomeCents)} take-home`,
            icon: CalendarDays,
            tone: "text-foreground",
          },
        ]
      : []),
    ...(scope === "week" && weekComparison
      ? [
          {
            label: "Week-over-week",
            value: `${weekComparison.differenceCents >= 0 ? "+" : ""}${formatMoney(weekComparison.differenceCents)}`,
            detail:
              weekComparison.percentage === null
                ? "vs previous week"
                : `${weekComparison.percentage >= 0 ? "+" : ""}${weekComparison.percentage.toFixed(1)}% vs previous week`,
            icon: TrendingUp,
            tone:
              weekComparison.differenceCents >= 0
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-destructive",
          },
        ]
      : []),
    ...(topPlatform
      ? [
          {
            label: "Top platform this month",
            value: topPlatform.platform,
            detail: `${formatMoney(topPlatform.estimatedTakeHomeCents)} take-home`,
            icon: Trophy,
            tone: "text-foreground",
          },
        ]
      : []),
  ];

  return (
    <Card aria-labelledby="insights-heading">
        <CardHeader className="pb-3">
          <h2
            id="insights-heading"
            className="text-base font-semibold leading-none tracking-tight"
          >
            Insights
          </h2>
          <CardDescription>
            A quick read on your latest financial performance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            {insights.map(({ label, value, detail, icon: Icon, tone }) => (
              <div key={label} className="flex min-w-0 gap-3">
                <span className="mt-0.5 rounded-lg bg-muted p-2 text-muted-foreground">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">
                    {label}
                  </p>
                  <p className={`mt-1 truncate text-lg font-semibold tabular-nums ${tone}`}>
                    {value}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {analyticsUnavailable && (
            <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
              Week-over-week and monthly insights are currently unavailable.
            </p>
          )}
        </CardContent>
    </Card>
  );
}
