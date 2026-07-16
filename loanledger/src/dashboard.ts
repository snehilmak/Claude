// Pure aggregation helpers for the dashboard. No I/O, so unit tested directly.

import type { Loan, Payment } from "./types";
import {
  currentBalance,
  periodInterest,
  totalInterestPaid,
  totalPrincipalPaid,
  roundMoney,
} from "./calc";

export interface BorrowerRow {
  name: string;
  loanCount: number;
  /** Loans still open with a balance > 0. */
  activeCount: number;
  /** Sum of current balances across the borrower's active loans. */
  outstanding: number;
  /** Interest due this period across the borrower's active loans. */
  periodInterest: number;
  /** All interest ever collected from this borrower. */
  interestCollected: number;
}

/**
 * Roll loans up by borrower name so the same person's loans combine into one
 * row. Sorted by largest outstanding exposure first.
 */
export function byBorrower(
  loans: Loan[],
  paymentsByLoan: Map<number, Payment[]>
): BorrowerRow[] {
  const map = new Map<string, BorrowerRow>();
  for (const loan of loans) {
    const payments = paymentsByLoan.get(loan.id) ?? [];
    let row = map.get(loan.name);
    if (!row) {
      row = {
        name: loan.name,
        loanCount: 0,
        activeCount: 0,
        outstanding: 0,
        periodInterest: 0,
        interestCollected: 0,
      };
      map.set(loan.name, row);
    }
    row.loanCount += 1;
    row.interestCollected += totalInterestPaid(payments);
    if (loan.status === "active") {
      const bal = currentBalance(loan, payments);
      row.outstanding += bal;
      row.periodInterest += periodInterest(loan, bal);
      if (bal > 0) row.activeCount += 1;
    }
  }
  const rows = [...map.values()].map((r) => ({
    ...r,
    outstanding: roundMoney(r.outstanding),
    periodInterest: roundMoney(r.periodInterest),
    interestCollected: roundMoney(r.interestCollected),
  }));
  rows.sort(
    (a, b) =>
      b.outstanding - a.outstanding ||
      b.interestCollected - a.interestCollected ||
      a.name.localeCompare(b.name)
  );
  return rows;
}

export interface MonthBucket {
  /** 'YYYY-MM'. */
  month: string;
  interest: number;
  principal: number;
}

/**
 * Bucket payment interest/principal into the `months` calendar months ending
 * at (and including) the month of `asOf`. Empty months are returned as zeros so
 * a chart has a continuous axis.
 */
export function monthlyTotals(
  payments: Payment[],
  asOf: string,
  months: number
): MonthBucket[] {
  const [y, m] = asOf.slice(0, 7).split("-").map(Number);
  const anchor = y * 12 + (m - 1); // month index since year 0
  const buckets: MonthBucket[] = [];
  const index = new Map<string, MonthBucket>();
  for (let i = months - 1; i >= 0; i--) {
    const mi = anchor - i;
    const by = Math.floor(mi / 12);
    const bm = (mi % 12) + 1;
    const key = `${by}-${String(bm).padStart(2, "0")}`;
    const bucket: MonthBucket = { month: key, interest: 0, principal: 0 };
    buckets.push(bucket);
    index.set(key, bucket);
  }
  for (const p of payments) {
    const bucket = index.get(p.date.slice(0, 7));
    if (bucket) {
      bucket.interest += p.interest_amount;
      bucket.principal += p.principal_amount;
    }
  }
  for (const b of buckets) {
    b.interest = roundMoney(b.interest);
    b.principal = roundMoney(b.principal);
  }
  return buckets;
}

/** Total principal repaid across every loan (for a headline tile). */
export function totalPrincipalRepaid(
  paymentsByLoan: Map<number, Payment[]>
): number {
  let sum = 0;
  for (const payments of paymentsByLoan.values()) {
    sum += totalPrincipalPaid(payments);
  }
  return roundMoney(sum);
}
