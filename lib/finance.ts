export type FinancialInputs = {
  grossCents: number;
  tipsCents: number;
  fuelCostCents: number;
  miles: number;
  mileageRateCents: number;
  taxRateBps: number;
};

export type FinancialResult = {
  baseEarningsCents: number;
  tipsCents: number;
  totalEarningsCents: number;
  fuelCostCents: number;
  cashProfitCents: number;
  mileageDeductionCents: number;
  estimatedTaxableProfitCents: number;
  estimatedTaxReserveCents: number;
  estimatedTakeHomeCents: number;
};

export type EntryInputs = FinancialInputs & {
  startedAtMilliseconds: number;
  endedAtMilliseconds: number;
};

export type EntryCalculation = FinancialResult & {
  workedMilliseconds: number;
  workedMinutes: number;
  workedHours: number;
  estimatedHourlyRateCents: number;
};

const MILLISECONDS_PER_MINUTE = 60_000;
const MILLISECONDS_PER_HOUR = 3_600_000;

function requireFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
}

function requireNonNegative(value: number, name: string): void {
  requireFinite(value, name);
  if (value < 0) {
    throw new RangeError(`${name} must be non-negative`);
  }
}

function requireNonNegativeSafeInteger(value: number, name: string): void {
  requireNonNegative(value, name);
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${name} must be a safe integer`);
  }
}

function requireSafeInteger(value: number, name: string): void {
  requireFinite(value, name);
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${name} must be a safe integer`);
  }
}

function checkedInteger(value: number, name: string): number {
  requireSafeInteger(value, name);
  return value;
}

function checkedRound(value: number, name: string): number {
  requireFinite(value, name);
  return checkedInteger(Math.round(value), name);
}

export function calculateFinancials(
  inputs: FinancialInputs
): FinancialResult {
  requireNonNegativeSafeInteger(inputs.grossCents, "grossCents");
  requireNonNegativeSafeInteger(inputs.tipsCents, "tipsCents");
  requireNonNegativeSafeInteger(inputs.fuelCostCents, "fuelCostCents");
  requireNonNegative(inputs.miles, "miles");
  requireNonNegativeSafeInteger(
    inputs.mileageRateCents,
    "mileageRateCents"
  );
  requireNonNegativeSafeInteger(inputs.taxRateBps, "taxRateBps");

  const totalEarningsCents = checkedInteger(
    inputs.grossCents + inputs.tipsCents,
    "totalEarningsCents"
  );
  const cashProfitCents = checkedInteger(
    totalEarningsCents - inputs.fuelCostCents,
    "cashProfitCents"
  );
  const mileageDeductionCents = checkedRound(
    inputs.miles * inputs.mileageRateCents,
    "mileageDeductionCents"
  );
  const estimatedTaxableProfitCents = checkedInteger(
    Math.max(0, totalEarningsCents - mileageDeductionCents),
    "estimatedTaxableProfitCents"
  );
  const estimatedTaxReserveCents = Math.max(
    0,
    checkedRound(
      (estimatedTaxableProfitCents * inputs.taxRateBps) / 10_000,
      "estimatedTaxReserveCents"
    )
  );
  const estimatedTakeHomeCents = checkedInteger(
    cashProfitCents - estimatedTaxReserveCents,
    "estimatedTakeHomeCents"
  );

  return {
    baseEarningsCents: inputs.grossCents,
    tipsCents: inputs.tipsCents,
    totalEarningsCents,
    fuelCostCents: inputs.fuelCostCents,
    cashProfitCents,
    mileageDeductionCents,
    estimatedTaxableProfitCents,
    estimatedTaxReserveCents,
    estimatedTakeHomeCents,
  };
}

export function calculateWorkedMilliseconds(
  startedAtMilliseconds: number,
  endedAtMilliseconds: number
): number {
  requireFinite(startedAtMilliseconds, "startedAtMilliseconds");
  requireFinite(endedAtMilliseconds, "endedAtMilliseconds");
  return Math.max(0, endedAtMilliseconds - startedAtMilliseconds);
}

export function calculateHourlyRateCents(
  estimatedTakeHomeCents: number,
  workedMilliseconds: number
): number {
  requireSafeInteger(estimatedTakeHomeCents, "estimatedTakeHomeCents");
  requireNonNegative(workedMilliseconds, "workedMilliseconds");

  if (workedMilliseconds === 0) return 0;

  return checkedRound(
    (estimatedTakeHomeCents * MILLISECONDS_PER_HOUR) / workedMilliseconds,
    "estimatedHourlyRateCents"
  );
}

export function calculateEntry(inputs: EntryInputs): EntryCalculation {
  const financials = calculateFinancials(inputs);
  const workedMilliseconds = calculateWorkedMilliseconds(
    inputs.startedAtMilliseconds,
    inputs.endedAtMilliseconds
  );

  return {
    ...financials,
    workedMilliseconds,
    workedMinutes: workedMilliseconds / MILLISECONDS_PER_MINUTE,
    workedHours: workedMilliseconds / MILLISECONDS_PER_HOUR,
    estimatedHourlyRateCents: calculateHourlyRateCents(
      financials.estimatedTakeHomeCents,
      workedMilliseconds
    ),
  };
}

export function aggregateCalculations(
  calculations: readonly EntryCalculation[]
): EntryCalculation {
  const aggregate: EntryCalculation = {
    baseEarningsCents: 0,
    tipsCents: 0,
    totalEarningsCents: 0,
    fuelCostCents: 0,
    cashProfitCents: 0,
    mileageDeductionCents: 0,
    estimatedTaxableProfitCents: 0,
    estimatedTaxReserveCents: 0,
    estimatedTakeHomeCents: 0,
    workedMilliseconds: 0,
    workedMinutes: 0,
    workedHours: 0,
    estimatedHourlyRateCents: 0,
  };

  for (const calculation of calculations) {
    aggregate.baseEarningsCents = checkedInteger(
      aggregate.baseEarningsCents + calculation.baseEarningsCents,
      "baseEarningsCents"
    );
    aggregate.tipsCents = checkedInteger(
      aggregate.tipsCents + calculation.tipsCents,
      "tipsCents"
    );
    aggregate.totalEarningsCents = checkedInteger(
      aggregate.totalEarningsCents + calculation.totalEarningsCents,
      "totalEarningsCents"
    );
    aggregate.fuelCostCents = checkedInteger(
      aggregate.fuelCostCents + calculation.fuelCostCents,
      "fuelCostCents"
    );
    aggregate.cashProfitCents = checkedInteger(
      aggregate.cashProfitCents + calculation.cashProfitCents,
      "cashProfitCents"
    );
    aggregate.mileageDeductionCents = checkedInteger(
      aggregate.mileageDeductionCents + calculation.mileageDeductionCents,
      "mileageDeductionCents"
    );
    aggregate.estimatedTaxableProfitCents = checkedInteger(
      aggregate.estimatedTaxableProfitCents +
        calculation.estimatedTaxableProfitCents,
      "estimatedTaxableProfitCents"
    );
    aggregate.estimatedTaxReserveCents = checkedInteger(
      aggregate.estimatedTaxReserveCents + calculation.estimatedTaxReserveCents,
      "estimatedTaxReserveCents"
    );
    aggregate.estimatedTakeHomeCents = checkedInteger(
      aggregate.estimatedTakeHomeCents + calculation.estimatedTakeHomeCents,
      "estimatedTakeHomeCents"
    );
    aggregate.workedMilliseconds = checkedInteger(
      aggregate.workedMilliseconds + calculation.workedMilliseconds,
      "workedMilliseconds"
    );
  }

  aggregate.workedMinutes =
    aggregate.workedMilliseconds / MILLISECONDS_PER_MINUTE;
  aggregate.workedHours =
    aggregate.workedMilliseconds / MILLISECONDS_PER_HOUR;
  aggregate.estimatedHourlyRateCents = calculateHourlyRateCents(
    aggregate.estimatedTakeHomeCents,
    aggregate.workedMilliseconds
  );

  return aggregate;
}
