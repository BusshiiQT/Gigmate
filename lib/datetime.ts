export type DateRange = {
  startInclusive: Date;
  endExclusive: Date;
};

export type UtcDateRange = {
  startInclusiveIso: string;
  endExclusiveIso: string;
};

function requireValidDate(value: Date, name: string): void {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new TypeError(`${name} must be a valid Date`);
  }
}

export function localDateTimeInputValue(value = new Date()): string {
  requireValidDate(value, "value");
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function utcIsoToLocalDateTimeInput(value: string): string {
  return localDateTimeInputValue(new Date(value));
}

export function localDateTimeInputToUtcIso(value: string): string {
  const date = new Date(value);
  requireValidDate(date, "value");
  return date.toISOString();
}

export function getStartOfLocalWeek(referenceDate: Date): Date {
  requireValidDate(referenceDate, "referenceDate");

  const start = new Date(referenceDate.getTime());
  start.setHours(0, 0, 0, 0);
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

export function getLocalWeekRange(
  referenceDate: Date,
  weekOffset = 0
): DateRange {
  if (!Number.isSafeInteger(weekOffset)) {
    throw new TypeError("weekOffset must be a safe integer");
  }

  const startInclusive = getStartOfLocalWeek(referenceDate);
  startInclusive.setDate(startInclusive.getDate() + weekOffset * 7);

  const endExclusive = new Date(startInclusive.getTime());
  endExclusive.setDate(endExclusive.getDate() + 7);

  return { startInclusive, endExclusive };
}

export function getCompletedUtcWeekRange(
  referenceDate: Date,
  weekOffset = 0
): DateRange {
  requireValidDate(referenceDate, "referenceDate");
  if (!Number.isSafeInteger(weekOffset)) {
    throw new TypeError("weekOffset must be a safe integer");
  }

  const daysSinceMonday = (referenceDate.getUTCDay() + 6) % 7;
  const currentMondayUtc = Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate() - daysSinceMonday
  );
  const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1_000;
  const endExclusive = new Date(
    currentMondayUtc + weekOffset * millisecondsPerWeek
  );
  const startInclusive = new Date(
    endExclusive.getTime() - millisecondsPerWeek
  );

  return { startInclusive, endExclusive };
}

export function getLocalMonthRange(
  referenceDate: Date,
  monthOffset = 0
): DateRange {
  requireValidDate(referenceDate, "referenceDate");
  if (!Number.isSafeInteger(monthOffset)) {
    throw new TypeError("monthOffset must be a safe integer");
  }

  const startInclusive = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + monthOffset,
    1
  );
  const endExclusive = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + monthOffset + 1,
    1
  );

  return { startInclusive, endExclusive };
}

export function getRecentLocalDaysRange(
  referenceDate: Date,
  dayCount: number
): DateRange {
  requireValidDate(referenceDate, "referenceDate");
  if (!Number.isSafeInteger(dayCount) || dayCount <= 0) {
    throw new TypeError("dayCount must be a positive safe integer");
  }

  const endExclusive = new Date(referenceDate.getTime());
  endExclusive.setHours(0, 0, 0, 0);
  endExclusive.setDate(endExclusive.getDate() + 1);

  const startInclusive = new Date(endExclusive.getTime());
  startInclusive.setDate(startInclusive.getDate() - dayCount);

  return { startInclusive, endExclusive };
}

export function getWeekRangeUtc(
  referenceDate: Date,
  weekOffset = 0
): UtcDateRange {
  const range = getLocalWeekRange(referenceDate, weekOffset);

  return {
    startInclusiveIso: range.startInclusive.toISOString(),
    endExclusiveIso: range.endExclusive.toISOString(),
  };
}

export function getLocalDateKey(value: Date): string {
  requireValidDate(value, "value");

  const year = String(value.getFullYear()).padStart(4, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getLocalMonthKey(value: Date): string {
  requireValidDate(value, "value");

  const year = String(value.getFullYear()).padStart(4, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function isInHalfOpenRange(value: Date, range: DateRange): boolean {
  requireValidDate(value, "value");
  requireValidDate(range.startInclusive, "range.startInclusive");
  requireValidDate(range.endExclusive, "range.endExclusive");

  const valueTime = value.getTime();
  return (
    valueTime >= range.startInclusive.getTime() &&
    valueTime < range.endExclusive.getTime()
  );
}
