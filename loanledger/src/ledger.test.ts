import { describe, it, expect } from "vitest";
import type { LedgerEntry } from "./types";
import {
  balancesByName,
  summarizeLedger,
  knownNames,
  activeBalances,
  settledNames,
  isContactSettled,
} from "./ledger";

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

describe("settled contacts", () => {
  const entries = [
    // ROY: in 5000, out 5000 -> net 0 (settled)
    entry({ name: "ROY", direction: "in", amount: 5000 }),
    entry({ name: "ROY", direction: "out", amount: 5000 }),
    // AMIN: out 14500 -> net -14500 (active)
    entry({ name: "AMIN", direction: "out", amount: 14500 }),
  ];

  it("flags a net-zero person as settled", () => {
    const rows = balancesByName(entries);
    const roy = rows.find((r) => r.name === "ROY")!;
    const amin = rows.find((r) => r.name === "AMIN")!;
    expect(isContactSettled(roy)).toBe(true);
    expect(isContactSettled(amin)).toBe(false);
  });

  it("activeBalances drops settled people", () => {
    const active = activeBalances(balancesByName(entries));
    expect(active.map((r) => r.name)).toEqual(["AMIN"]);
  });

  it("settledNames returns the hidden names", () => {
    const names = settledNames(balancesByName(entries));
    expect(names.has("ROY")).toBe(true);
    expect(names.has("AMIN")).toBe(false);
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
