import { describe, it, expect } from "vitest";
import type { LedgerEntry } from "./types";
import { balancesByName, summarizeLedger, knownNames } from "./ledger";

let nextId = 1;
function entry(overrides: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: nextId++,
    date: "2024-06-21",
    name: "JONNY",
    direction: "in",
    amount: 100,
    note: "",
    created_at: "2024-06-21",
    ...overrides,
  };
}

describe("balancesByName", () => {
  it("nets in minus out per person", () => {
    const entries = [
      entry({ name: "ROY", direction: "in", amount: 30000 }),
      entry({ name: "ROY", direction: "out", amount: 3000 }),
      entry({ name: "ROY", direction: "out", amount: 5000 }),
    ];
    const rows = balancesByName(entries);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: "ROY",
      totalIn: 30000,
      totalOut: 8000,
      net: 22000,
      entryCount: 3,
    });
  });

  it("handles negative nets (more paid out than received)", () => {
    const entries = [
      entry({ name: "AMIN", direction: "out", amount: 14500 }),
    ];
    expect(balancesByName(entries)[0].net).toBe(-14500);
  });

  it("sorts by absolute net, largest first", () => {
    const entries = [
      entry({ name: "SMALL", direction: "in", amount: 10 }),
      entry({ name: "BIGNEG", direction: "out", amount: 5000 }),
      entry({ name: "MID", direction: "in", amount: 300 }),
    ];
    expect(balancesByName(entries).map((r) => r.name)).toEqual([
      "BIGNEG",
      "MID",
      "SMALL",
    ]);
  });

  it("rounds to cents", () => {
    const entries = [
      entry({ direction: "in", amount: 0.1 }),
      entry({ direction: "in", amount: 0.2 }),
    ];
    expect(balancesByName(entries)[0].net).toBe(0.3);
  });
});

describe("summarizeLedger", () => {
  it("rolls up totals, contacts, and entries", () => {
    const entries = [
      entry({ name: "A", direction: "in", amount: 1000 }),
      entry({ name: "A", direction: "out", amount: 400 }),
      entry({ name: "B", direction: "out", amount: 250 }),
    ];
    expect(summarizeLedger(entries)).toEqual({
      totalIn: 1000,
      totalOut: 650,
      net: 350,
      contacts: 2,
      entries: 3,
    });
  });

  it("is all zeros when empty", () => {
    expect(summarizeLedger([])).toEqual({
      totalIn: 0,
      totalOut: 0,
      net: 0,
      contacts: 0,
      entries: 0,
    });
  });
});

describe("knownNames", () => {
  it("returns distinct sorted names", () => {
    const entries = [
      entry({ name: "ROY" }),
      entry({ name: "AMIN" }),
      entry({ name: "ROY" }),
    ];
    expect(knownNames(entries)).toEqual(["AMIN", "ROY"]);
  });
});
