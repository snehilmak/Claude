import { describe, it, expect } from "vitest";
import type { LedgerEntry, NewLedgerEntry } from "./types";
import {
  parseImportFile,
  dedupeAgainstExisting,
  IMPORT_FORMAT,
  IMPORT_VERSION,
} from "./import";

function validFile(entries: unknown[] = []): string {
  return JSON.stringify({
    format: IMPORT_FORMAT,
    version: IMPORT_VERSION,
    ledger: entries,
  });
}

const goodEntry = {
  date: "2024-06-21",
  name: "JONNY",
  direction: "in",
  amount: 10000,
  note: "Cash",
};

describe("parseImportFile", () => {
  it("parses a valid file", () => {
    const result = parseImportFile(validFile([goodEntry]));
    expect(result.ledger).toEqual([
      { date: "2024-06-21", name: "JONNY", direction: "in", amount: 10000, note: "Cash" },
    ]);
  });

  it("defaults a missing note to empty string", () => {
    const { note: _omit, ...noNote } = goodEntry;
    expect(parseImportFile(validFile([noNote])).ledger[0].note).toBe("");
  });

  it("trims whitespace and rounds amounts to cents", () => {
    const messy = { ...goodEntry, name: "  ROY ", amount: 12.345, note: " x " };
    const parsed = parseImportFile(validFile([messy])).ledger[0];
    expect(parsed.name).toBe("ROY");
    expect(parsed.amount).toBe(12.35);
    expect(parsed.note).toBe("x");
  });

  it("accepts zero amounts (marker rows from spreadsheets)", () => {
    expect(
      parseImportFile(validFile([{ ...goodEntry, amount: 0 }])).ledger[0].amount
    ).toBe(0);
  });

  it("rejects non-JSON", () => {
    expect(() => parseImportFile("hello")).toThrow(/valid JSON/);
  });

  it("rejects the wrong format marker", () => {
    const bad = JSON.stringify({ format: "other", version: 1, ledger: [] });
    expect(() => parseImportFile(bad)).toThrow(/Not a LoanLedger import file/);
  });

  it("rejects an unsupported version", () => {
    const bad = JSON.stringify({ format: IMPORT_FORMAT, version: 99, ledger: [] });
    expect(() => parseImportFile(bad)).toThrow(/Unsupported import version/);
  });

  it("rejects a missing ledger array", () => {
    const bad = JSON.stringify({ format: IMPORT_FORMAT, version: IMPORT_VERSION });
    expect(() => parseImportFile(bad)).toThrow(/no "ledger" array/);
  });

  it.each([
    [{ ...goodEntry, date: "06/21/2024" }, /YYYY-MM-DD/],
    [{ ...goodEntry, date: 20240621 }, /YYYY-MM-DD/],
    [{ ...goodEntry, name: "  " }, /"name" is required/],
    [{ ...goodEntry, direction: "deposit" }, /"direction" must be/],
    [{ ...goodEntry, amount: -5 }, /non-negative number/],
    [{ ...goodEntry, amount: "10000" }, /non-negative number/],
    [{ ...goodEntry, amount: NaN }, /non-negative number/],
    [{ ...goodEntry, note: 42 }, /"note" must be text/],
  ])("rejects bad entry %#", (entry, message) => {
    expect(() => parseImportFile(validFile([entry]))).toThrow(message);
  });

  it("reports the failing entry's position", () => {
    expect(() =>
      parseImportFile(validFile([goodEntry, { ...goodEntry, direction: "x" }]))
    ).toThrow(/ledger entry 2/);
  });
});

function existing(overrides: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: 1,
    date: "2024-06-21",
    name: "JONNY",
    direction: "in",
    amount: 10000,
    note: "Cash",
    created_at: "2024-06-21",
    ...overrides,
  };
}

const incoming: NewLedgerEntry = {
  date: "2024-06-21",
  name: "JONNY",
  direction: "in",
  amount: 10000,
  note: "Cash",
};

describe("dedupeAgainstExisting", () => {
  it("passes everything through when the DB is empty", () => {
    const result = dedupeAgainstExisting([incoming], []);
    expect(result.fresh).toEqual([incoming]);
    expect(result.skipped).toBe(0);
  });

  it("skips entries that already exist (re-import is safe)", () => {
    const result = dedupeAgainstExisting([incoming], [existing()]);
    expect(result.fresh).toEqual([]);
    expect(result.skipped).toBe(1);
  });

  it("keeps entries that differ in any field", () => {
    const different: NewLedgerEntry = { ...incoming, amount: 9999 };
    const result = dedupeAgainstExisting([different], [existing()]);
    expect(result.fresh).toEqual([different]);
  });

  it("absorbs one incoming copy per existing row, keeps genuine extras", () => {
    // DB has ONE copy; file has the same entry TWICE (e.g. two identical
    // real-world payments). One is absorbed, one is imported.
    const result = dedupeAgainstExisting([incoming, { ...incoming }], [existing()]);
    expect(result.fresh).toHaveLength(1);
    expect(result.skipped).toBe(1);
  });

  it("skips both copies when the DB already has both", () => {
    const twoExisting = [existing(), existing({ id: 2 })];
    const result = dedupeAgainstExisting([incoming, { ...incoming }], twoExisting);
    expect(result.fresh).toHaveLength(0);
    expect(result.skipped).toBe(2);
  });
});
