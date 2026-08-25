// Node executes the CSV tests directly and requires the runtime extension.
// @ts-expect-error TypeScript does not allow .ts extensions without allowImportingTsExtensions.
import { calculateEntry } from "./finance.ts";

export type CsvCell = string | number | null | undefined;

export type ExportEntry = {
  id: string;
  platform: string | null;
  started_at: string;
  ended_at: string;
  gross_cents: number;
  tips_cents: number | null;
  miles: number | null;
  fuel_cost_cents: number | null;
  notes: string | null;
};

export type ExportSettings = {
  mileage_rate_cents: number | null;
  tax_rate_bps: number | null;
} | null;

export const EXPORT_HEADERS = [
  "ID",
  "Platform",
  "Started At UTC",
  "Ended At UTC",
  "Miles",
  "Base Earnings (USD)",
  "Tips (USD)",
  "Fuel Cost (USD)",
  "Notes",
  "Total Earnings (USD)",
  "Cash Profit (USD)",
  "Mileage Deduction (USD)",
  "Estimated Taxable Profit (USD)",
  "Estimated Tax Reserve (USD)",
  "Estimated Take-Home (USD)",
  "Worked Hours",
] as const;

// These defensive values mirror the database defaults.
const DEFAULT_MILEAGE_RATE_CENTS = 67;
const DEFAULT_TAX_RATE_BPS = 1_500;

export function escapeCsvCell(value: CsvCell): string {
  if (value == null) return "";

  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r\n]/.test(text)) {
    text = `'${text}`;
  }

  if (/[,"\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function serializeCsv(rows: readonly (readonly CsvCell[])[]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

export function buildEntryExportRows(
  entries: readonly ExportEntry[],
  settings: ExportSettings
): CsvCell[][] {
  const mileageRateCents =
    settings?.mileage_rate_cents ?? DEFAULT_MILEAGE_RATE_CENTS;
  const taxRateBps = settings?.tax_rate_bps ?? DEFAULT_TAX_RATE_BPS;

  return entries.map((entry) => {
    const startedAtMilliseconds = new Date(entry.started_at).getTime();
    const endedAtMilliseconds = new Date(entry.ended_at).getTime();
    const calculation = calculateEntry({
      grossCents: entry.gross_cents,
      tipsCents: entry.tips_cents ?? 0,
      fuelCostCents: entry.fuel_cost_cents ?? 0,
      miles: entry.miles ?? 0,
      mileageRateCents,
      taxRateBps,
      startedAtMilliseconds,
      endedAtMilliseconds,
    });

    return [
      entry.id,
      entry.platform,
      new Date(startedAtMilliseconds).toISOString(),
      new Date(endedAtMilliseconds).toISOString(),
      entry.miles ?? 0,
      calculation.baseEarningsCents / 100,
      calculation.tipsCents / 100,
      calculation.fuelCostCents / 100,
      entry.notes,
      calculation.totalEarningsCents / 100,
      calculation.cashProfitCents / 100,
      calculation.mileageDeductionCents / 100,
      calculation.estimatedTaxableProfitCents / 100,
      calculation.estimatedTaxReserveCents / 100,
      calculation.estimatedTakeHomeCents / 100,
      calculation.workedHours,
    ];
  });
}

export function buildEntryExportCsv(
  entries: readonly ExportEntry[],
  settings: ExportSettings
): string {
  return serializeCsv([
    EXPORT_HEADERS,
    ...buildEntryExportRows(entries, settings),
  ]);
}
