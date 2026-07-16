// Pure cash-ledger math. No I/O so these are unit tested directly.

import { roundMoney } from "./calc";
import type { LedgerEntry } from "./types";

export interface ContactBalance {
  name: string;
  totalIn: number;
  totalOut: number;
  /** in − out. Matches a spreadsheet "remaining balance" per person. */
  net: number;
  entryCount: number;
}

export interface LedgerSummary {
  totalIn: number;
  totalOut: number;
  net: number;
  contacts: number;
  entries: number;
}

/** Per-person totals, sorted by largest absolute net first. */
export function balancesByName(entries: LedgerEntry[]): ContactBalance[] {
  const map = new Map<string, ContactBalance>();
  for (const e of entries) {
    let row = map.get(e.name);
    if (!row) {
      row = { name: e.name, totalIn: 0, totalOut: 0, net: 0, entryCount: 0 };
      map.set(e.name, row);
    }
    if (e.direction === "in") row.totalIn += e.amount;
    else row.totalOut += e.amount;
    row.entryCount += 1;
  }
  const rows = [...map.values()].map((r) => ({
    ...r,
    totalIn: roundMoney(r.totalIn),
    totalOut: roundMoney(r.totalOut),
    net: roundMoney(r.totalIn - r.totalOut),
  }));
  rows.sort((a, b) => Math.abs(b.net) - Math.abs(a.net) || a.name.localeCompare(b.name));
  return rows;
}

/**
 * A person/account is "settled" when their money in and out cancel out (net
 * zero). Settled names are hidden from the default ledger view.
 */
export function isContactSettled(balance: ContactBalance): boolean {
  return roundMoney(balance.net) === 0;
}

/** Only the people who still carry a non-zero balance. */
export function activeBalances(balances: ContactBalance[]): ContactBalance[] {
  return balances.filter((b) => !isContactSettled(b));
}

/** Names whose balance is settled (net zero) — hidden by default. */
export function settledNames(balances: ContactBalance[]): Set<string> {
  return new Set(balances.filter(isContactSettled).map((b) => b.name));
}

/** Whole-ledger rollup. */
export function summarizeLedger(entries: LedgerEntry[]): LedgerSummary {
  let totalIn = 0;
  let totalOut = 0;
  const names = new Set<string>();
  for (const e of entries) {
    if (e.direction === "in") totalIn += e.amount;
    else totalOut += e.amount;
    names.add(e.name);
  }
  return {
    totalIn: roundMoney(totalIn),
    totalOut: roundMoney(totalOut),
    net: roundMoney(totalIn - totalOut),
    contacts: names.size,
    entries: entries.length,
  };
}

/** Distinct names, alphabetical — used for the entry form's autocomplete. */
export function knownNames(entries: LedgerEntry[]): string[] {
  return [...new Set(entries.map((e) => e.name))].sort((a, b) =>
    a.localeCompare(b)
  );
}
