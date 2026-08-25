import { format } from "date-fns";

// Node executes the weekly-summary tests directly and requires the runtime extension.
// @ts-expect-error TypeScript does not allow .ts extensions without allowImportingTsExtensions.
import { aggregateCalculations, calculateEntry, type EntryCalculation } from "./finance.ts";

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
  baseEarningsCents: number;
  totalTipsCents: number;
  totalEarningsCents: number;
  fuelCostCents: number;
  cashProfitCents: number;
  mileageDeductionCents: number;
  estimatedTaxableProfitCents: number;
  estimatedTaxReserveCents: number;
  estimatedTakeHomeCents: number;
  workedMilliseconds: number;
  workedHours: number;
  effectiveHourlyCents: number;
  bestDayLabel: string | null;
  bestDayEstimatedTakeHomeCents: number | null;
};

// Defensive fallbacks match the database defaults. The supplied user settings
// remain authoritative whenever either value is present.
const DEFAULT_MILEAGE_RATE_CENTS = 67;
const DEFAULT_TAX_RATE_BPS = 1_500;

export function calculateWeeklyStats(
  entries: EntryRow[],
  settings: SettingsRow | null
): WeeklyStats {
  const mileageRateCents =
    settings?.mileage_rate_cents ?? DEFAULT_MILEAGE_RATE_CENTS;
  const taxRateBps =
    settings?.tax_rate_bps ?? DEFAULT_TAX_RATE_BPS;

  const calculations: EntryCalculation[] = [];
  const calculationsByDay = new Map<
    string,
    { label: string; calculations: EntryCalculation[] }
  >();

  for (const entry of entries) {
    const start = new Date(entry.started_at);
    const end = entry.ended_at ? new Date(entry.ended_at) : null;
    const hasValidDuration =
      Number.isFinite(start.getTime()) &&
      end != null &&
      Number.isFinite(end.getTime());
    const calculation = calculateEntry({
      grossCents: entry.gross_cents ?? 0,
      tipsCents: entry.tips_cents ?? 0,
      fuelCostCents: entry.fuel_cost_cents ?? 0,
      miles: entry.miles ?? 0,
      mileageRateCents,
      taxRateBps,
      startedAtMilliseconds: hasValidDuration ? start.getTime() : 0,
      endedAtMilliseconds: hasValidDuration ? end.getTime() : 0,
    });

    calculations.push(calculation);

    if (hasValidDuration) {
      const dayKey = format(start, "yyyy-MM-dd");
      const day = calculationsByDay.get(dayKey) ?? {
        label: format(start, "EEEE"),
        calculations: [],
      };
      day.calculations.push(calculation);
      calculationsByDay.set(dayKey, day);
    }
  }

  const weekly = aggregateCalculations(calculations);

  let bestDayLabel: string | null = null;
  let bestDayEstimatedTakeHomeCents: number | null = null;

  for (const day of calculationsByDay.values()) {
    const dayTakeHomeCents = aggregateCalculations(
      day.calculations
    ).estimatedTakeHomeCents;
    if (
      bestDayEstimatedTakeHomeCents == null ||
      dayTakeHomeCents > bestDayEstimatedTakeHomeCents
    ) {
      bestDayEstimatedTakeHomeCents = dayTakeHomeCents;
      bestDayLabel = day.label;
    }
  }

  return {
    baseEarningsCents: weekly.baseEarningsCents,
    totalTipsCents: weekly.tipsCents,
    totalEarningsCents: weekly.totalEarningsCents,
    fuelCostCents: weekly.fuelCostCents,
    cashProfitCents: weekly.cashProfitCents,
    mileageDeductionCents: weekly.mileageDeductionCents,
    estimatedTaxableProfitCents: weekly.estimatedTaxableProfitCents,
    estimatedTaxReserveCents: weekly.estimatedTaxReserveCents,
    estimatedTakeHomeCents: weekly.estimatedTakeHomeCents,
    workedMilliseconds: weekly.workedMilliseconds,
    workedHours: weekly.workedHours,
    effectiveHourlyCents: weekly.estimatedHourlyRateCents,
    bestDayLabel,
    bestDayEstimatedTakeHomeCents,
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

  const earnings = formatCurrencyFromCents(thisWeek.totalEarningsCents);
  const fuel = formatCurrencyFromCents(thisWeek.fuelCostCents);
  const cashProfit = formatCurrencyFromCents(thisWeek.cashProfitCents);
  const mileage = formatCurrencyFromCents(thisWeek.mileageDeductionCents);
  const taxableProfit = formatCurrencyFromCents(
    thisWeek.estimatedTaxableProfitCents
  );
  const taxReserve = formatCurrencyFromCents(
    thisWeek.estimatedTaxReserveCents
  );
  const takeHome = formatCurrencyFromCents(thisWeek.estimatedTakeHomeCents);
  const hourly = formatCurrencyFromCents(thisWeek.effectiveHourlyCents);

  const hoursWorked = thisWeek.workedHours.toFixed(1);

  let comparisonLine = "No prior week data to compare yet.";
  if (previousWeek && previousWeek.totalEarningsCents > 0) {
    const diff =
      thisWeek.estimatedTakeHomeCents - previousWeek.estimatedTakeHomeCents;
    const diffPct =
      previousWeek.estimatedTakeHomeCents !== 0
        ? (diff / previousWeek.estimatedTakeHomeCents) * 100
        : 0;

    if (Math.abs(diffPct) < 5) {
      comparisonLine =
        "Your estimated take-home was about the same as last week.";
    } else if (diffPct > 0) {
      comparisonLine = `Your estimated take-home was ${diffPct.toFixed(
        1
      )}% higher than last week. Nice work.`;
    } else {
      comparisonLine = `Your estimated take-home was ${Math.abs(diffPct).toFixed(
        1
      )}% lower than last week. That might just be normal variability.`;
    }
  }

  let bestDayLine = "No completed shifts this week.";
  if (
    thisWeek.bestDayLabel &&
    thisWeek.bestDayEstimatedTakeHomeCents != null
  ) {
    bestDayLine = `Your best day was ${thisWeek.bestDayLabel} with ${formatCurrencyFromCents(
      thisWeek.bestDayEstimatedTakeHomeCents
    )} estimated take-home.`;
  }

  const subject = `Your GigMate weekly summary (${weekLabel})`;

  const html = `
  <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #111827;">
    <h1 style="font-size: 20px; margin-bottom: 12px;">Hi ${name}, here’s your GigMate weekly summary.</h1>
    <p style="margin-bottom: 16px; color: #4B5563;">Period: <strong>${weekLabel}</strong></p>

    <table style="border-collapse: collapse; margin-bottom: 16px;">
      <tbody>
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #6B7280;">Total earnings</td>
          <td style="padding: 4px 0;"><strong>${earnings}</strong></td>
        </tr>
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #6B7280;">Fuel cost</td>
          <td style="padding: 4px 0;">${fuel}</td>
        </tr>
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #6B7280;">Cash profit</td>
          <td style="padding: 4px 0;">${cashProfit}</td>
        </tr>
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #6B7280;">Mileage deduction</td>
          <td style="padding: 4px 0;">${mileage}</td>
        </tr>
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #6B7280;">Estimated taxable profit</td>
          <td style="padding: 4px 0;">${taxableProfit}</td>
        </tr>
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #6B7280;">Estimated tax reserve</td>
          <td style="padding: 4px 0;">${taxReserve}</td>
        </tr>
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #6B7280;">Estimated take-home</td>
          <td style="padding: 4px 0;"><strong>${takeHome}</strong></td>
        </tr>
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #6B7280;">Hours worked</td>
          <td style="padding: 4px 0;">${hoursWorked}h</td>
        </tr>
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #6B7280;">Effective hourly rate</td>
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

Total earnings: ${earnings}
Fuel cost: ${fuel}
Cash profit: ${cashProfit}
Mileage deduction: ${mileage}
Estimated taxable profit: ${taxableProfit}
Estimated tax reserve: ${taxReserve}
Estimated take-home: ${takeHome}
Hours worked: ${hoursWorked}h
Effective hourly rate: ${hourly}/hr

${bestDayLine}
${comparisonLine}

You’re receiving this because you have a GigMate account.
  `.trim();

  return { subject, html, text };
}
