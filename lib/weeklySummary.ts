import { differenceInMinutes, format } from "date-fns";

export type EntryRow = {
  id: string;
  user_id: string;
  started_at: string; // ISO string in DB
  ended_at: string | null; // ISO string or null
  gross_cents: number;
  tips_cents: number | null;
  miles: number | null;
  fuel_cost_cents: number | null;
  platform: string | null;
};

export type SettingsRow = {
  user_id: string;
  mileage_rate_cents: number | null; // cents per mile
  tax_rate_bps: number | null; // basis points, e.g. 2500 = 25%
};

export type WeeklyStats = {
  totalGrossCents: number;
  totalTipsCents: number;
  totalFuelCents: number;
  totalMileageCents: number;
  estimatedTaxCents: number;
  netCents: number;
  totalMinutes: number;
  effectiveHourlyCents: number;
  bestDayLabel: string | null;
  bestDayNetCents: number | null;
};

export function calculateWeeklyStats(
  entries: EntryRow[],
  settings: SettingsRow | null
): WeeklyStats {
  const mileageRateCents =
    settings?.mileage_rate_cents != null ? settings.mileage_rate_cents : 65; // default 0.65/mile
  const taxRateBps =
    settings?.tax_rate_bps != null ? settings.tax_rate_bps : 2500; // default 25%

  let totalGrossCents = 0;
  let totalTipsCents = 0;
  let totalFuelCents = 0;
  let totalMileageCents = 0;
  let totalMinutes = 0;

  const netByDay = new Map<string, number>();

  for (const entry of entries) {
    const gross = entry.gross_cents ?? 0;
    const tips = entry.tips_cents ?? 0;
    const miles = entry.miles ?? 0;
    const fuel = entry.fuel_cost_cents ?? 0;

    totalGrossCents += gross;
    totalTipsCents += tips;
    totalFuelCents += fuel;

    const mileageExpenseCents = Math.round(miles * mileageRateCents);
    totalMileageCents += mileageExpenseCents;

    if (entry.started_at && entry.ended_at) {
      const start = new Date(entry.started_at);
      const end = new Date(entry.ended_at);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const minutes = Math.max(differenceInMinutes(end, start), 0);
        totalMinutes += minutes;

        const dayLabel = format(start, "EEEE"); // e.g. "Monday"
        const netBeforeTaxCents = gross + tips - fuel - mileageExpenseCents;
        netByDay.set(
          dayLabel,
          (netByDay.get(dayLabel) ?? 0) + netBeforeTaxCents
        );
      }
    }
  }

  const estimatedTaxCents = Math.round(
    (totalGrossCents * taxRateBps) / 10000
  );
  const netCents =
    totalGrossCents +
    totalTipsCents -
    totalFuelCents -
    totalMileageCents -
    estimatedTaxCents;

  const effectiveHourlyCents =
    totalMinutes > 0 ? Math.round((netCents * 60) / totalMinutes) : 0;

  let bestDayLabel: string | null = null;
  let bestDayNetCents: number | null = null;

  for (const [day, net] of netByDay.entries()) {
    if (bestDayNetCents == null || net > bestDayNetCents) {
      bestDayNetCents = net;
      bestDayLabel = day;
    }
  }

  return {
    totalGrossCents,
    totalTipsCents,
    totalFuelCents,
    totalMileageCents,
    estimatedTaxCents,
    netCents,
    totalMinutes,
    effectiveHourlyCents,
    bestDayLabel,
    bestDayNetCents,
  };
}

export function formatCurrencyFromCents(cents: number): string {
  const dollars = (cents ?? 0) / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type EmailBuildParams = {
  userFirstName: string | null;
  weekLabel: string;
  thisWeek: WeeklyStats;
  previousWeek: WeeklyStats | null;
};

export function buildWeeklySummaryEmail({
  userFirstName,
  weekLabel,
  thisWeek,
  previousWeek,
}: EmailBuildParams): { subject: string; html: string; text: string } {
  const name = userFirstName?.trim() || "there";

  const gross = formatCurrencyFromCents(thisWeek.totalGrossCents);
  const net = formatCurrencyFromCents(thisWeek.netCents);
  const fuel = formatCurrencyFromCents(thisWeek.totalFuelCents);
  const mileage = formatCurrencyFromCents(thisWeek.totalMileageCents);
  const tax = formatCurrencyFromCents(thisWeek.estimatedTaxCents);
  const hourly = formatCurrencyFromCents(thisWeek.effectiveHourlyCents);

  const hoursWorked = (thisWeek.totalMinutes / 60).toFixed(1);

  let comparisonLine = "No prior week data to compare yet.";
  if (previousWeek && previousWeek.totalGrossCents > 0) {
    const diff = thisWeek.netCents - previousWeek.netCents;
    const diffPct =
      previousWeek.netCents !== 0
        ? (diff / previousWeek.netCents) * 100
        : 0;

    if (Math.abs(diffPct) < 5) {
      comparisonLine = "You earned about the same net as last week.";
    } else if (diffPct > 0) {
      comparisonLine = `You earned ${diffPct.toFixed(
        1
      )}% more net than last week. Nice work.`;
    } else {
      comparisonLine = `You earned ${Math.abs(diffPct).toFixed(
        1
      )}% less net than last week. That might just be normal variability.`;
    }
  }

  let bestDayLine = "No completed shifts this week.";
  if (thisWeek.bestDayLabel && thisWeek.bestDayNetCents != null) {
    bestDayLine = `Your best day was ${thisWeek.bestDayLabel} with ${formatCurrencyFromCents(
      thisWeek.bestDayNetCents
    )} net.`;
  }

  const subject = `Your GigMate weekly summary (${weekLabel})`;

  const html = `
  <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #111827;">
    <h1 style="font-size: 20px; margin-bottom: 12px;">Hi ${name}, here’s your GigMate weekly summary.</h1>
    <p style="margin-bottom: 16px; color: #4B5563;">Period: <strong>${weekLabel}</strong></p>

    <table style="border-collapse: collapse; margin-bottom: 16px;">
      <tbody>
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #6B7280;">Total gross</td>
          <td style="padding: 4px 0;"><strong>${gross}</strong></td>
        </tr>
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #6B7280;">Estimated fuel</td>
          <td style="padding: 4px 0;">${fuel}</td>
        </tr>
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #6B7280;">Mileage expense</td>
          <td style="padding: 4px 0;">${mileage}</td>
        </tr>
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #6B7280;">Estimated tax</td>
          <td style="padding: 4px 0;">${tax}</td>
        </tr>
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #6B7280;">Net profit</td>
          <td style="padding: 4px 0;"><strong>${net}</strong></td>
        </tr>
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #6B7280;">Hours worked</td>
          <td style="padding: 4px 0;">${hoursWorked}h</td>
        </tr>
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #6B7280;">Effective hourly</td>
          <td style="padding: 4px 0;"><strong>${hourly}/hr</strong></td>
        </tr>
      </tbody>
    </table>

    <p style="margin-bottom: 8px;">${bestDayLine}</p>
    <p style="margin-bottom: 16px;">${comparisonLine}</p>

    <p style="margin-top: 24px; font-size: 12px; color: #9CA3AF;">
      You’re receiving this because you have a GigMate account. To change notification settings later, you’ll be able to update your preferences in Settings.
    </p>
  </div>
  `;

  const text = `
Hi ${name}, here’s your GigMate weekly summary.
Period: ${weekLabel}

Total gross: ${gross}
Estimated fuel: ${fuel}
Mileage expense: ${mileage}
Estimated tax: ${tax}
Net profit: ${net}
Hours worked: ${hoursWorked}h
Effective hourly: ${hourly}/hr

${bestDayLine}
${comparisonLine}

You’re receiving this because you have a GigMate account.
  `.trim();

  return { subject, html, text };
}
