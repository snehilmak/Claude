import { describe, it, expect } from "vitest";
import type { Loan, Payment } from "./types";
import {
  currentBalance,
  periodInterest,
  totalInterestPaid,
  totalPrincipalPaid,
  projectSchedule,
  summarize,
  roundMoney,
} from "./calc";

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
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  };
}

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 1,
    loan_id: 1,
    date: "2026-01-08",
    interest_amount: 0,
    principal_amount: 0,
    note: "",
    created_at: "2026-01-08",
    ...overrides,
  };
}

describe("currentBalance", () => {
  it("returns full principal when nothing repaid", () => {
    expect(currentBalance(makeLoan(), [])).toBe(380000);
  });

  it("subtracts principal payments", () => {
    const payments = [
      makePayment({ principal_amount: 30000 }),
      makePayment({ id: 2, principal_amount: 20000 }),
    ];
    expect(currentBalance(makeLoan(), payments)).toBe(330000);
  });

  it("ignores interest-only payments", () => {
    const payments = [makePayment({ interest_amount: 3800 })];
    expect(currentBalance(makeLoan(), payments)).toBe(380000);
  });

  it("never goes below zero", () => {
    const payments = [makePayment({ principal_amount: 400000 })];
    expect(currentBalance(makeLoan(), payments)).toBe(0);
  });
});

describe("periodInterest", () => {
  it("computes 1% weekly on the full balance", () => {
    expect(periodInterest(makeLoan(), 380000)).toBe(3800);
  });

  it("drops as the balance is paid down", () => {
    expect(periodInterest(makeLoan(), 330000)).toBe(3300);
  });
});

describe("payment totals", () => {
  const payments = [
    makePayment({ interest_amount: 3800, principal_amount: 50000 }),
    makePayment({ id: 2, interest_amount: 3300, principal_amount: 0 }),
  ];
  it("sums interest", () => {
    expect(totalInterestPaid(payments)).toBe(7100);
  });
  it("sums principal", () => {
    expect(totalPrincipalPaid(payments)).toBe(50000);
  });
});

describe("projectSchedule", () => {
  it("projects weekly interest on a flat balance", () => {
    const rows = projectSchedule(makeLoan(), 380000, "2026-01-01", 3);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      period: 1,
      dueDate: "2026-01-08",
      interestDue: 3800,
    });
    expect(rows[2].dueDate).toBe("2026-01-22");
  });

  it("steps by months for monthly loans", () => {
    const loan = makeLoan({ interest_period: "monthly", interest_rate: 0.02 });
    const rows = projectSchedule(loan, 100000, "2026-01-15", 2);
    expect(rows[0].dueDate).toBe("2026-02-15");
    expect(rows[0].interestDue).toBe(2000);
  });
});

describe("summarize", () => {
  it("rolls up active loans and collected totals", () => {
    const loanA = makeLoan({ id: 1 });
    const loanB = makeLoan({ id: 2, principal_original: 100000, status: "closed" });
    const byLoan = new Map<number, Payment[]>([
      [1, [makePayment({ interest_amount: 3800, principal_amount: 50000 })]],
      [2, [makePayment({ loan_id: 2, interest_amount: 1000, principal_amount: 100000 })]],
    ]);
    const s = summarize([loanA, loanB], byLoan);
    // Only loanA is active: balance 330000, interest 3300.
    expect(s.totalOutstanding).toBe(330000);
    expect(s.totalPeriodInterest).toBe(3300);
    expect(s.activeLoans).toBe(1);
    // Collected totals include both loans.
    expect(s.totalInterestCollected).toBe(4800);
    expect(s.totalPrincipalCollected).toBe(150000);
  });
});

describe("roundMoney", () => {
  it("rounds to cents", () => {
    expect(roundMoney(3800.005)).toBe(3800.01);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });
});
