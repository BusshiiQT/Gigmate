import assert from "node:assert/strict";
import test from "node:test";

// Node executes this TypeScript file directly and requires the runtime extension.
// @ts-expect-error TypeScript does not allow .ts extensions without allowImportingTsExtensions.
import { calculateEntry } from "./finance.ts";
// @ts-expect-error TypeScript does not allow .ts extensions without allowImportingTsExtensions.
import { buildWeeklySummaryEmail, calculateWeeklyStats, type EntryRow, type SettingsRow } from "./weeklySummary.ts";

const SETTINGS: SettingsRow = {
  user_id: "user-1",
  mileage_rate_cents: 67,
  tax_rate_bps: 1_500,
};

function entry(overrides: Partial<EntryRow> = {}): EntryRow {
  return {
    id: "entry-1",
    user_id: "user-1",
    started_at: "2026-08-17T09:00:00.000Z",
    ended_at: "2026-08-17T10:00:00.000Z",
    gross_cents: 10_000,
    tips_cents: 0,
    miles: 0,
    fuel_cost_cents: 0,
    platform: "Test",
    ...overrides,
  };
}

test("uses authoritative tips, fuel, mileage, taxable-profit, and reserve semantics", () => {
  const stats = calculateWeeklyStats([
    entry({ tips_cents: 2_000, fuel_cost_cents: 1_500, miles: 50 }),
  ], SETTINGS);

  assert.equal(stats.totalEarningsCents, 12_000);
  assert.equal(stats.fuelCostCents, 1_500);
  assert.equal(stats.cashProfitCents, 10_500);
  assert.equal(stats.mileageDeductionCents, 3_350);
  assert.equal(stats.estimatedTaxableProfitCents, 8_650);
  assert.equal(stats.estimatedTaxReserveCents, 1_298);
  assert.equal(stats.estimatedTakeHomeCents, 9_202);
});

test("defensive settings fallbacks match database defaults", () => {
  const stats = calculateWeeklyStats([entry({ miles: 10 })], null);

  assert.equal(stats.mileageDeductionCents, 670);
  assert.equal(stats.estimatedTaxReserveCents, 1_400);
});

test("weekly aggregation equals the sum of authoritative entry results", () => {
  const entries = [
    entry({ id: "one", tips_cents: 500, fuel_cost_cents: 800, miles: 12.5 }),
    entry({
      id: "two",
      started_at: "2026-08-18T10:00:00.000Z",
      ended_at: "2026-08-18T11:30:00.000Z",
      gross_cents: 7_500,
      tips_cents: 250,
      fuel_cost_cents: 600,
      miles: 8,
    }),
  ];
  const expected = entries.map((row) =>
    calculateEntry({
      grossCents: row.gross_cents,
      tipsCents: row.tips_cents ?? 0,
      fuelCostCents: row.fuel_cost_cents ?? 0,
      miles: row.miles ?? 0,
      mileageRateCents: 67,
      taxRateBps: 1_500,
      startedAtMilliseconds: new Date(row.started_at).getTime(),
      endedAtMilliseconds: new Date(row.ended_at!).getTime(),
    })
  );
  const stats = calculateWeeklyStats(entries, SETTINGS);

  assert.equal(
    stats.estimatedTakeHomeCents,
    expected.reduce((sum, result) => sum + result.estimatedTakeHomeCents, 0)
  );
  assert.equal(
    stats.estimatedTaxReserveCents,
    expected.reduce((sum, result) => sum + result.estimatedTaxReserveCents, 0)
  );
});

test("best day groups multiple entries on the same calendar day", () => {
  const stats = calculateWeeklyStats(
    [
      entry({ id: "monday-1", gross_cents: 4_000 }),
      entry({
        id: "monday-2",
        started_at: "2026-08-17T13:00:00.000Z",
        ended_at: "2026-08-17T14:00:00.000Z",
        gross_cents: 4_000,
      }),
      entry({
        id: "tuesday",
        started_at: "2026-08-18T09:00:00.000Z",
        ended_at: "2026-08-18T10:00:00.000Z",
        gross_cents: 7_000,
      }),
    ],
    { ...SETTINGS, tax_rate_bps: 0 }
  );

  assert.equal(stats.bestDayLabel, "Monday");
  assert.equal(stats.bestDayEstimatedTakeHomeCents, 8_000);
});

test("aggregates exact elapsed duration for the effective hourly rate", () => {
  const stats = calculateWeeklyStats(
    [
      entry({ ended_at: "2026-08-17T10:00:30.000Z" }),
      entry({
        id: "two",
        started_at: "2026-08-18T09:00:00.000Z",
        ended_at: "2026-08-18T09:00:30.000Z",
        gross_cents: 100,
      }),
    ],
    { ...SETTINGS, tax_rate_bps: 0 }
  );

  assert.equal(stats.workedMilliseconds, 3_660_000);
  assert.equal(stats.workedHours, 61 / 60);
  assert.equal(stats.effectiveHourlyCents, 9_934);
});

test("keeps negative estimated take-home representable", () => {
  const stats = calculateWeeklyStats(
    [entry({ gross_cents: 1_000, fuel_cost_cents: 1_500 })],
    { ...SETTINGS, tax_rate_bps: 1_000 }
  );

  assert.equal(stats.cashProfitCents, -500);
  assert.equal(stats.estimatedTakeHomeCents, -600);
  assert.equal(stats.effectiveHourlyCents, -600);
});

test("email uses unambiguous financial labels", () => {
  const stats = calculateWeeklyStats([entry()], SETTINGS);
  const email = buildWeeklySummaryEmail({
    userFirstName: "Avery",
    weekLabel: "Aug 17–23",
    thisWeek: stats,
    previousWeek: null,
  });

  for (const label of [
    "Total earnings",
    "Fuel cost",
    "Cash profit",
    "Mileage deduction",
    "Estimated taxable profit",
    "Estimated tax reserve",
    "Estimated take-home",
    "Effective hourly rate",
  ]) {
    assert.match(email.text, new RegExp(label));
  }
  assert.doesNotMatch(email.text, /Estimated fuel|Mileage expense|Net profit/);
});
