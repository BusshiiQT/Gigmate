import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node executes this TypeScript file directly.
import { entrySchema, settingsSchema } from "./validation.ts";

const validEntry = {
  platform: "Uber",
  started_at: "2026-08-25T22:00",
  ended_at: "2026-08-25T23:00",
  gross: "0",
  tips: "0",
  miles: "0",
  fuel_cost: "0",
  notes: "",
};

test("valid entry is accepted", () => {
  assert.equal(entrySchema.safeParse(validEntry).success, true);
});

for (const [name, field] of [
  ["negative gross", "gross"],
  ["negative tips", "tips"],
  ["negative mileage", "miles"],
  ["negative fuel", "fuel_cost"],
] as const) {
  test(`${name} is rejected`, () => {
    assert.equal(entrySchema.safeParse({ ...validEntry, [field]: "-0.01" }).success, false);
  });
}

test("invalid numeric values are rejected", () => {
  for (const gross of ["abc", "NaN", "Infinity", "1.2.3", " 12"]) {
    assert.equal(entrySchema.safeParse({ ...validEntry, gross }).success, false);
  }
});

test("invalid date is rejected", () => {
  assert.equal(entrySchema.safeParse({ ...validEntry, started_at: "not-a-date" }).success, false);
});

test("same start and end are rejected", () => {
  assert.equal(entrySchema.safeParse({ ...validEntry, ended_at: validEntry.started_at }).success, false);
});

test("end before start is rejected", () => {
  assert.equal(entrySchema.safeParse({ ...validEntry, ended_at: "2026-08-25T21:59" }).success, false);
});

test("valid overnight shift is accepted", () => {
  assert.equal(entrySchema.safeParse({ ...validEntry, ended_at: "2026-08-26T02:00" }).success, true);
});

test("tax rate below zero is rejected", () => {
  assert.equal(settingsSchema.safeParse({ mileageRate: "0.67", taxRate: "-0.01" }).success, false);
});

test("tax rate above 100% is rejected", () => {
  assert.equal(settingsSchema.safeParse({ mileageRate: "0.67", taxRate: "100.01" }).success, false);
});

test("valid 15% tax setting is accepted", () => {
  assert.equal(settingsSchema.safeParse({ mileageRate: "0.67", taxRate: "15" }).success, true);
});

test("nonnegative mileage rates are accepted", () => {
  assert.equal(settingsSchema.safeParse({ mileageRate: "0", taxRate: "15" }).success, true);
  assert.equal(settingsSchema.safeParse({ mileageRate: "1.25", taxRate: "15" }).success, true);
});
