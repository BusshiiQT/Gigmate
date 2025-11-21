"use client";

import type { EntryRow, SettingsRow } from "@/lib/types";
import {
  durationHours,
  mileageDeductionCents,
  taxEstimateCents,
  netProfitCents,
} from "@/lib/utils";
import {
  format,
  parseISO,
  startOfWeek,
  subDays,
  isAfter,
} from "date-fns";

interface PatternInsightsProps {
  entries: EntryRow[];
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
  totalNet: number;
  totalHours: number;
};

type TimeBucket = {
  key: string;
  label: string;
  startHour: number;
  endHour: number; // exclusive
  totalNet: number;
  totalHours: number;
};

export default function PatternInsights({
  entries,
  settings,
}: PatternInsightsProps) {
  if (!entries.length || !settings) return null;

  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);

  // Use last 30 days to keep patterns fresh
  const recent = entries.filter((e) =>
    isAfter(parseISO(e.started_at), thirtyDaysAgo)
  );
  if (!recent.length) return null;

  // Helper to compute net + hours
  const computeStats = (e: EntryRow) => {
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
    return { net, hours };
  };

  // ---------- 1) BEST DAY OF WEEK (avg hourly) ----------
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayBuckets: DayBucket[] = dayLabels.map((label) => ({
    label,
    totalNet: 0,
    totalHours: 0,
  }));

  for (const e of recent) {
    const d = parseISO(e.started_at);
    const { net, hours } = computeStats(e);
    const dow = d.getDay(); // 0..6
    dayBuckets[dow].totalNet += net;
    dayBuckets[dow].totalHours += hours;
  }

  let bestDay: { label: string; hourly: number } | null = null;

  for (const b of dayBuckets) {
    if (b.totalHours <= 0) continue;
    const hourly = b.totalNet / b.totalHours;
    if (!bestDay || hourly > bestDay.hourly) {
      bestDay = { label: b.label, hourly };
    }
  }

  // ---------- 2) BEST TIME WINDOW (avg hourly) ----------
  const timeBuckets: TimeBucket[] = [
    {
      key: "morning",
      label: "Morning (5–11 AM)",
      startHour: 5,
      endHour: 11,
      totalNet: 0,
      totalHours: 0,
    },
    {
      key: "afternoon",
      label: "Afternoon (11 AM–5 PM)",
      startHour: 11,
      endHour: 17,
      totalNet: 0,
      totalHours: 0,
    },
    {
      key: "evening",
      label: "Evening (5–10 PM)",
      startHour: 17,
      endHour: 22,
      totalNet: 0,
      totalHours: 0,
    },
    {
      key: "late",
      label: "Late night (10 PM–5 AM)",
      startHour: 22,
      endHour: 29, // treat >24 as next day
      totalNet: 0,
      totalHours: 0,
    },
  ];

  for (const e of recent) {
    const d = parseISO(e.started_at);
    let hour = d.getHours(); // 0-23

    // Map to our custom 22-29 range for late night
    let bucket: TimeBucket | undefined;
    for (const b of timeBuckets) {
      const h = hour < 5 && b.key === "late" ? hour + 24 : hour;
      if (h >= b.startHour && h < b.endHour) {
        bucket = b;
        break;
      }
    }

    if (!bucket) continue;
    const { net, hours } = computeStats(e);
    bucket.totalNet += net;
    bucket.totalHours += hours;
  }

  let bestTime: { label: string; hourly: number } | null = null;
  for (const b of timeBuckets) {
    if (b.totalHours <= 0) continue;
    const hourly = b.totalNet / b.totalHours;
    if (!bestTime || hourly > bestTime.hourly) {
      bestTime = { label: b.label, hourly };
    }
  }

  // ---------- 3) BEST PLATFORM ON WEEKENDS ----------
  const weekendNetByPlatform = new Map<string, { net: number; hours: number }>();

  for (const e of recent) {
    const d = parseISO(e.started_at);
    const dow = d.getDay(); // 0=Sun, 6=Sat
    const isWeekend = dow === 0 || dow === 6;
    if (!isWeekend) continue;

    const { net, hours } = computeStats(e);
    const prev = weekendNetByPlatform.get(e.platform) || { net: 0, hours: 0 };
    weekendNetByPlatform.set(e.platform, {
      net: prev.net + net,
      hours: prev.hours + hours,
    });
  }

  let bestWeekendPlatform:
    | { platform: string; hourly: number; labelHours: number }
    | null = null;

  for (const [platform, { net, hours }] of weekendNetByPlatform.entries()) {
    if (hours <= 0) continue;
    const hourly = net / hours;
    if (!bestWeekendPlatform || hourly > bestWeekendPlatform.hourly) {
      bestWeekendPlatform = { platform, hourly, labelHours: hours };
    }
  }

  // If no patterns at all, don't render
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
            {bestDay.label} with{" "}
            {formatMoney(Math.round(bestDay.hourly))}/hr.
          </li>
        )}

        {bestTime && (
          <li>
            <span className="font-medium">Best time window:</span>{" "}
            {bestTime.label} — around{" "}
            {formatMoney(Math.round(bestTime.hourly))}/hr on average.
          </li>
        )}

        {bestWeekendPlatform && (
          <li>
            <span className="font-medium">Weekend standout:</span>{" "}
            {bestWeekendPlatform.platform} on Sat/Sun, about{" "}
            {formatMoney(Math.round(bestWeekendPlatform.hourly))}/hr over{" "}
            {bestWeekendPlatform.labelHours.toFixed(1)} hrs.
          </li>
        )}

        <li className="pt-1 text-slate-600 dark:text-slate-400">
          Use these patterns to plan your next week: lean into the days,
          times, and apps where your hourly is strongest.
        </li>
      </ul>
    </section>
  );
}
