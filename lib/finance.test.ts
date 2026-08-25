import assert from "node:assert/strict";
import test from "node:test";

// Node executes this TypeScript file directly and requires the runtime extension.
// @ts-expect-error TypeScript does not allow .ts extensions without allowImportingTsExtensions.
import { aggregateCalculations, calculateEntry, calculateFinancials, calculateHourlyRateCents, calculateWorkedMilliseconds, type FinancialInputs } from "./finance.ts";

const BASE_INPUTS: FinancialInputs = {
  grossCents: 10_000,
  tipsCents: 0,
  fuelCostCents: 0,
  miles: 0,
  mileageRateCents: 67,
  taxRateBps: 0,
};

test("calculates base earnings only", () => {
  const result = calculateFinancials(BASE_INPUTS);

  assert.equal(result.baseEarningsCents, 10_000);
  assert.equal(result.totalEarningsCents, 10_000);
  assert.equal(result.cashProfitCents, 10_000);
  assert.equal(result.estimatedTaxableProfitCents, 10_000);
  assert.equal(result.estimatedTakeHomeCents, 10_000);
});

test("adds tips to total earnings, taxable profit, and take-home", () => {
  const result = calculateFinancials({
    ...BASE_INPUTS,
    tipsCents: 2_000,
    taxRateBps: 1_000,
  });

  assert.equal(result.totalEarningsCents, 12_000);
  assert.equal(result.estimatedTaxableProfitCents, 12_000);
  assert.equal(result.estimatedTaxReserveCents, 1_200);
  assert.equal(result.estimatedTakeHomeCents, 10_800);
});

test("fuel reduces cash profit but not taxable profit", () => {
  const withoutFuel = calculateFinancials(BASE_INPUTS);
  const withFuel = calculateFinancials({ ...BASE_INPUTS, fuelCostCents: 2_500 });

  assert.equal(withFuel.cashProfitCents, 7_500);
  assert.equal(
    withFuel.estimatedTaxableProfitCents,
    withoutFuel.estimatedTaxableProfitCents
  );
});

test("rounds the mileage deduction to integer cents", () => {
  const result = calculateFinancials({ ...BASE_INPUTS, miles: 1.5 });

  assert.equal(result.mileageDeductionCents, 101);
});

test("rounds the estimated tax reserve to integer cents", () => {
  const result = calculateFinancials({
    ...BASE_INPUTS,
    grossCents: 10_005,
    taxRateBps: 1_500,
  });

  assert.equal(result.estimatedTaxReserveCents, 1_501);
});

test("mileage deduction does not reduce cash profit", () => {
  const result = calculateFinancials({ ...BASE_INPUTS, miles: 100 });

  assert.equal(result.mileageDeductionCents, 6_700);
  assert.equal(result.cashProfitCents, 10_000);
});

test("fuel does not reduce taxable profit or tax reserve", () => {
  const result = calculateFinancials({
    ...BASE_INPUTS,
    fuelCostCents: 9_000,
    taxRateBps: 1_500,
  });

  assert.equal(result.estimatedTaxableProfitCents, 10_000);
  assert.equal(result.estimatedTaxReserveCents, 1_500);
});

test("allows negative cash profit and estimated take-home", () => {
  const result = calculateFinancials({
    ...BASE_INPUTS,
    grossCents: 1_000,
    fuelCostCents: 1_500,
    taxRateBps: 1_000,
  });

  assert.equal(result.cashProfitCents, -500);
  assert.equal(result.estimatedTakeHomeCents, -600);
});

test("floors taxable profit and tax reserve at zero", () => {
  const result = calculateFinancials({
    ...BASE_INPUTS,
    grossCents: 1_000,
    miles: 20,
    taxRateBps: 1_500,
  });

  assert.equal(result.estimatedTaxableProfitCents, 0);
  assert.equal(result.estimatedTaxReserveCents, 0);
});

test("treats tips as income when gross is zero", () => {
  const result = calculateFinancials({
    ...BASE_INPUTS,
    grossCents: 0,
    tipsCents: 2_000,
    taxRateBps: 1_500,
  });

  assert.equal(result.totalEarningsCents, 2_000);
  assert.equal(result.estimatedTaxableProfitCents, 2_000);
  assert.equal(result.estimatedTaxReserveCents, 300);
});

test("a zero tax rate produces no reserve", () => {
  const result = calculateFinancials(BASE_INPUTS);

  assert.equal(result.estimatedTaxReserveCents, 0);
  assert.equal(result.estimatedTakeHomeCents, result.cashProfitCents);
});

test("zero and negative durations produce zero duration and hourly rate", () => {
  assert.equal(calculateWorkedMilliseconds(1_000, 1_000), 0);
  assert.equal(calculateWorkedMilliseconds(2_000, 1_000), 0);
  assert.equal(calculateHourlyRateCents(5_000, 0), 0);
});

test("calculates a negative take-home hourly rate", () => {
  assert.equal(calculateHourlyRateCents(-1_001, 7_200_000), -500);
});

test("aggregates entry-level results and exact elapsed time", () => {
  const first = calculateEntry({
    ...BASE_INPUTS,
    startedAtMilliseconds: 0,
    endedAtMilliseconds: 5_400_000,
  });
  const second = calculateEntry({
    ...BASE_INPUTS,
    grossCents: 5_000,
    tipsCents: 500,
    startedAtMilliseconds: 10_000_000,
    endedAtMilliseconds: 11_800_000,
  });
  const result = aggregateCalculations([first, second]);

  assert.equal(result.baseEarningsCents, 15_000);
  assert.equal(result.tipsCents, 500);
  assert.equal(result.totalEarningsCents, 15_500);
  assert.equal(result.estimatedTakeHomeCents, 15_500);
  assert.equal(result.workedMilliseconds, 7_200_000);
  assert.equal(result.workedHours, 2);
  assert.equal(result.estimatedHourlyRateCents, 7_750);
});

test("aggregation is independent of entry order", () => {
  const first = calculateEntry({
    ...BASE_INPUTS,
    startedAtMilliseconds: 0,
    endedAtMilliseconds: 3_600_000,
  });
  const second = calculateEntry({
    ...BASE_INPUTS,
    grossCents: 5_000,
    startedAtMilliseconds: 0,
    endedAtMilliseconds: 1_800_000,
  });

  assert.deepEqual(
    aggregateCalculations([first, second]),
    aggregateCalculations([second, first])
  );
});

test("rejects NaN and Infinity inputs", () => {
  assert.throws(
    () => calculateFinancials({ ...BASE_INPUTS, miles: Number.NaN }),
    TypeError
  );
  assert.throws(
    () =>
      calculateFinancials({
        ...BASE_INPUTS,
        taxRateBps: Number.POSITIVE_INFINITY,
      }),
    TypeError
  );
  assert.throws(
    () => calculateWorkedMilliseconds(0, Number.NEGATIVE_INFINITY),
    TypeError
  );
});

test("matches the authoritative example", () => {
  const result = calculateFinancials({
    grossCents: 10_000,
    tipsCents: 2_000,
    fuelCostCents: 1_500,
    miles: 50,
    mileageRateCents: 67,
    taxRateBps: 1_500,
  });

  assert.equal(result.totalEarningsCents, 12_000);
  assert.equal(result.cashProfitCents, 10_500);
  assert.equal(result.mileageDeductionCents, 3_350);
  assert.equal(result.estimatedTaxableProfitCents, 8_650);
  assert.equal(result.estimatedTaxReserveCents, 1_298);
  assert.equal(result.estimatedTakeHomeCents, 9_202);
});
