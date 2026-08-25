import assert from "node:assert/strict";
import test from "node:test";

// Node executes this TypeScript file directly and requires the runtime extension.
// @ts-expect-error TypeScript does not allow .ts extensions without allowImportingTsExtensions.
import { getLocalDateKey, getLocalMonthKey, getLocalMonthRange, getLocalWeekRange, getRecentLocalDaysRange, getStartOfLocalWeek, getWeekRangeUtc, isInHalfOpenRange } from "./datetime.ts";

test("Monday 00:00 belongs to the new week", () => {
  const monday = new Date(2026, 7, 24, 0, 0, 0, 0);
  const range = getLocalWeekRange(monday);

  assert.equal(range.startInclusive.getTime(), monday.getTime());
  assert.equal(isInHalfOpenRange(monday, range), true);
});

test("Sunday 23:59:59.999 belongs to the current week", () => {
  const reference = new Date(2026, 7, 26, 12);
  const sundayEnd = new Date(2026, 7, 30, 23, 59, 59, 999);

  assert.equal(isInHalfOpenRange(sundayEnd, getLocalWeekRange(reference)), true);
});

test("the following Monday 00:00 is excluded", () => {
  const reference = new Date(2026, 7, 26, 12);
  const followingMonday = new Date(2026, 7, 31, 0, 0, 0, 0);

  assert.equal(
    isInHalfOpenRange(followingMonday, getLocalWeekRange(reference)),
    false
  );
});

test("adjacent weeks meet at one boundary without overlapping", () => {
  const reference = new Date(2026, 7, 26, 12);
  const previous = getLocalWeekRange(reference, -1);
  const current = getLocalWeekRange(reference);

  assert.equal(previous.endExclusive.getTime(), current.startInclusive.getTime());
  assert.equal(isInHalfOpenRange(current.startInclusive, previous), false);
  assert.equal(isInHalfOpenRange(current.startInclusive, current), true);
});

test("a Sunday-start Monday-end entry belongs to the earlier week", () => {
  const sundayStart = new Date(2026, 7, 30, 23, 0);
  const mondayEnd = new Date(2026, 7, 31, 2, 0);
  const earlierWeek = getLocalWeekRange(sundayStart);
  const newWeek = getLocalWeekRange(mondayEnd);

  assert.equal(isInHalfOpenRange(sundayStart, earlierWeek), true);
  assert.equal(isInHalfOpenRange(sundayStart, newWeek), false);
});

test("an entry starting before Monday is excluded from the new week", () => {
  const sundayStart = new Date(2026, 7, 30, 23, 30);
  const mondayEnd = new Date(2026, 7, 31, 1, 0);
  const newWeek = getLocalWeekRange(mondayEnd);

  assert.equal(isInHalfOpenRange(sundayStart, newWeek), false);
});

test("a normal midweek date produces Monday through next Monday", () => {
  const wednesday = new Date(2026, 7, 26, 15, 45);
  const expectedMonday = new Date(2026, 7, 24, 0, 0, 0, 0);
  const expectedNextMonday = new Date(2026, 7, 31, 0, 0, 0, 0);
  const range = getLocalWeekRange(wednesday);
  const utcRange = getWeekRangeUtc(wednesday);

  assert.equal(getStartOfLocalWeek(wednesday).getTime(), expectedMonday.getTime());
  assert.equal(range.startInclusive.getTime(), expectedMonday.getTime());
  assert.equal(range.endExclusive.getTime(), expectedNextMonday.getTime());
  assert.equal(utcRange.startInclusiveIso, expectedMonday.toISOString());
  assert.equal(utcRange.endExclusiveIso, expectedNextMonday.toISOString());
});

test("local date keys use local calendar components", () => {
  assert.equal(getLocalDateKey(new Date(2026, 7, 26, 23, 30)), "2026-08-26");
});

test("local month ranges are first-of-month half-open boundaries", () => {
  const range = getLocalMonthRange(new Date(2026, 7, 26, 23, 30));
  const previous = getLocalMonthRange(new Date(2026, 7, 26, 23, 30), -1);

  assert.equal(range.startInclusive.getTime(), new Date(2026, 7, 1).getTime());
  assert.equal(range.endExclusive.getTime(), new Date(2026, 8, 1).getTime());
  assert.equal(previous.startInclusive.getTime(), new Date(2026, 6, 1).getTime());
  assert.equal(previous.endExclusive.getTime(), new Date(2026, 7, 1).getTime());
});

test("local month keys use local year and month components", () => {
  assert.equal(getLocalMonthKey(new Date(2026, 7, 26, 23, 30)), "2026-08");
});

test("recent local day ranges include today and the preceding calendar days", () => {
  const range = getRecentLocalDaysRange(new Date(2026, 7, 26, 15, 45), 30);

  assert.equal(range.startInclusive.getTime(), new Date(2026, 6, 28).getTime());
  assert.equal(range.endExclusive.getTime(), new Date(2026, 7, 27).getTime());
  assert.equal(isInHalfOpenRange(new Date(2026, 6, 28), range), true);
  assert.equal(isInHalfOpenRange(new Date(2026, 7, 27), range), false);
});

test("recent local day ranges reject invalid day counts", () => {
  assert.throws(() => getRecentLocalDaysRange(new Date(), 0), TypeError);
  assert.throws(() => getRecentLocalDaysRange(new Date(), 1.5), TypeError);
});
