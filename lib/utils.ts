// lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { differenceInMilliseconds } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(cents: number, currency = "USD", locale = "en-US") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format((cents ?? 0) / 100);
}

export function toCents(value: number | string): number {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

// ---------- Calculations (server truth in cents) ----------
export function durationHours(startISO: string, endISO: string): number {
  const ms = differenceInMilliseconds(new Date(endISO), new Date(startISO));
  const h = ms / (1000 * 60 * 60);
  return Math.max(0, Math.round(h * 100) / 100); // 2 decimals
}

export function mileageDeductionCents(miles: number, mileage_rate_cents: number) {
  return Math.round((miles ?? 0) * (mileage_rate_cents ?? 0));
}

export function taxEstimateCents(
  gross_cents: number,
  mileage_deduction_cents: number,
  fuel_cost_cents: number,
  tax_rate_bps: number
) {
  const taxable = Math.max(0, (gross_cents ?? 0) - (mileage_deduction_cents ?? 0) - (fuel_cost_cents ?? 0));
  return Math.round(taxable * (tax_rate_bps ?? 0) / 10000);
}

export function netProfitCents(
  gross_cents: number,
  fuel_cost_cents: number,
  tax_estimate_cents: number
) {
  return (gross_cents ?? 0) - (fuel_cost_cents ?? 0) - (tax_estimate_cents ?? 0);
}

export function effectiveHourlyRateCents(net_cents: number, hours: number) {
  if (!hours || hours <= 0) return 0;
  return Math.round((net_cents ?? 0) / hours);
}
