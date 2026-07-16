import { describe, it, expect } from "vitest";
import type { Loan, Payment } from "./types";
import { byBorrower, monthlyTotals, totalPrincipalRepaid } from "./dashboard";

/** Local payment-grouping to avoid importing the Tauri-backed db module. */
function groupPaymentsByLoan(payments: Payment[]): Map<number, Payment[]> {
  const map = new Map<number, Payment[]>();
  for (const p of payments) {
    const list = map.get(p.loan_id);
    if (list) list.push(p);
    else map.set(p.loan_id, [p]);
  }
  return map;
}

function makeLoan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: 1,
    name: "Acme Corp",
    principal_original: 380000,
    interest_rate: 0.01,
    interest_period: "weekly",
    start_date: "2026-01-01",
    status: "active",
    notes: "",
    phone: "",
    email: "",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  };
}

let pid = 1;
function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: pid++,
    loan_id: 1,
    date: "2026-03-08",
    interest_amount: 0,
    principal_amount: 0,
    note: "",
    created_at: "2026-03-08",
    ...overrides,
  };
}

describe("byBorrower", () => {
  it("combines multiple loans for the same name", () => {
    const loans = [
      makeLoan({ id: 1, name: "ROY", principal_original: 100000 }),
      makeLoan({ id: 2, name: "ROY", principal_original: 50000 }),
      makeLoan({ id: 3, name: "AMIN", principal_original: 20000 }),
    ];
    const payments = [
      makePayment({ loan_id: 1, principal_amount: 40000, interest_amount: 1000 }),
      makePayment({ loan_id: 2, interest_amount: 500 }),
    ];
    const rows = byBorrower(loans, groupPaymentsByLoan(payments));

    const roy = rows.find((r) => r.name === "ROY")!;
    expect(roy.loanCount).toBe(2);
    expect(roy.activeCount).toBe(2);
    // 100000 - 40000 = 60000, plus 50000 = 110000 outstanding
    expect(roy.outstanding).toBe(110000);
    // 1% of 60000 + 1% of 50000 = 600 + 500 = 1100
    expect(roy.periodInterest).toBe(1100);
    expect(roy.interestCollected).toBe(1500);
  });

  it("sorts by outstanding descending", () => {
    const loans = [
      makeLoan({ id: 1, name: "SMALL", principal_original: 1000 }),
      makeLoan({ id: 2, name: "BIG", principal_original: 900000 }),
    ];
    const rows = byBorrower(loans, groupPaymentsByLoan([]));
    expect(rows.map((r) => r.name)).toEqual(["BIG", "SMALL"]);
  });

  it("excludes closed loans from outstanding but keeps collected", () => {
    const loans = [makeLoan({ id: 1, name: "ROY", status: "closed" })];
    const payments = [makePayment({ loan_id: 1, interest_amount: 3800 })];
    const rows = byBorrower(loans, groupPaymentsByLoan(payments));
    expect(rows[0].outstanding).toBe(0);
    expect(rows[0].activeCount).toBe(0);
    expect(rows[0].interestCollected).toBe(3800);
  });
});

describe("monthlyTotals", () => {
  it("buckets payments into the trailing months and zero-fills gaps", () => {
    const payments = [
      makePayment({ date: "2026-01-10", interest_amount: 1000 }),
      makePayment({ date: "2026-03-05", interest_amount: 500 }),
      makePayment({ date: "2026-03-20", interest_amount: 700, principal_amount: 5000 }),
    ];
    const buckets = monthlyTotals(payments, "2026-03-15", 3);
    expect(buckets.map((b) => b.month)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(buckets[0].interest).toBe(1000);
    expect(buckets[1].interest).toBe(0); // zero-filled gap
    expect(buckets[2].interest).toBe(1200);
    expect(buckets[2].principal).toBe(5000);
  });

  it("ignores payments outside the window", () => {
    const payments = [makePayment({ date: "2025-01-01", interest_amount: 999 })];
    const buckets = monthlyTotals(payments, "2026-03-15", 3);
    expect(buckets.reduce((s, b) => s + b.interest, 0)).toBe(0);
  });

  it("crosses a year boundary correctly", () => {
    const buckets = monthlyTotals([], "2026-01-15", 3);
    expect(buckets.map((b) => b.month)).toEqual(["2025-11", "2025-12", "2026-01"]);
  });
});

describe("totalPrincipalRepaid", () => {
  it("sums principal across all loans", () => {
    const payments = [
      makePayment({ loan_id: 1, principal_amount: 40000 }),
      makePayment({ loan_id: 2, principal_amount: 10000 }),
      makePayment({ loan_id: 2, principal_amount: 5000 }),
    ];
    expect(totalPrincipalRepaid(groupPaymentsByLoan(payments))).toBe(55000);
  });
});
