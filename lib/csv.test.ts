import assert from "node:assert/strict";
import test from "node:test";

// Node executes this TypeScript file directly and requires runtime extensions.
// @ts-expect-error TypeScript does not allow .ts extensions without allowImportingTsExtensions.
import { buildEntryExportRows, escapeCsvCell, serializeCsv, type ExportEntry } from "./csv.ts";

const ENTRY: ExportEntry = {
  id: "entry-1",
  platform: "DoorDash",
  started_at: "2026-08-24T10:00:00.000Z",
  ended_at: "2026-08-24T12:00:00.000Z",
  gross_cents: 10_000,
  tips_cents: 2_000,
  miles: 50,
  fuel_cost_cents: 1_500,
  notes: "Safe note",
};

test("escapes commas, quotes, newlines, and carriage returns", () => {
  assert.equal(escapeCsvCell("one,two"), '"one,two"');
  assert.equal(escapeCsvCell('say "hello"'), '"say ""hello"""');
  assert.equal(escapeCsvCell("one\ntwo"), '"one\ntwo"');
  assert.equal(escapeCsvCell("one\rtwo"), '"one\rtwo"');
});

test("mitigates spreadsheet formulas in every string cell", () => {
  assert.equal(escapeCsvCell("=1+1"), "'=1+1");
  assert.equal(escapeCsvCell("+SUM(A1:A2)"), "'+SUM(A1:A2)");
  assert.equal(escapeCsvCell("-2+3"), "'-2+3");
  assert.equal(escapeCsvCell("@cmd"), "'@cmd");
  assert.equal(escapeCsvCell("\t=cmd"), "'\t=cmd");
  assert.equal(serializeCsv([["safe", "=unsafe"]]), "safe,'=unsafe");
});

test("preserves safe and empty values", () => {
  assert.equal(escapeCsvCell("DoorDash"), "DoorDash");
  assert.equal(escapeCsvCell(""), "");
  assert.equal(escapeCsvCell(null), "");
});

test("calculated export values use authoritative financial semantics", () => {
  const [row] = buildEntryExportRows([ENTRY], {
    mileage_rate_cents: 67,
    tax_rate_bps: 1_500,
  });

  assert.equal(row[5], 100);
  assert.equal(row[6], 20);
  assert.equal(row[7], 15);
  assert.equal(row[9], 120);
  assert.equal(row[10], 105);
  assert.equal(row[11], 33.5);
  assert.equal(row[12], 86.5);
  assert.equal(row[13], 12.98);
  assert.equal(row[14], 92.02);
  assert.equal(row[15], 2);
});

test("fuel is cash expense only and mileage is deduction only", () => {
  const [row] = buildEntryExportRows([ENTRY], {
    mileage_rate_cents: 67,
    tax_rate_bps: 0,
  });

  assert.equal(row[10], 105);
  assert.equal(row[11], 33.5);
  assert.equal(row[12], 86.5);
  assert.equal(row[14], 105);
});

test("negative estimated take-home remains a numeric export value", () => {
  const [row] = buildEntryExportRows(
    [{ ...ENTRY, gross_cents: 1_000, tips_cents: 0, fuel_cost_cents: 1_500, miles: 0 }],
    { mileage_rate_cents: 67, tax_rate_bps: 1_000 }
  );

  assert.equal(row[14], -6);
  assert.equal(escapeCsvCell(row[14]), "-6");
});

test("defensive export settings match database defaults", () => {
  const [row] = buildEntryExportRows([ENTRY], null);

  assert.equal(row[11], 33.5);
  assert.equal(row[13], 12.98);
});
