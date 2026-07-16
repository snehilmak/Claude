// Pure loan-math helpers. No I/O here so these can be unit tested directly.

import type { Loan, Payment, InterestPeriod } from "./types";

/** Round to cents to avoid floating point noise in displayed money. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Total principal repaid across the given payments. */
export function totalPrincipalPaid(payments: Payment[]): number {
  return roundMoney(payments.reduce((sum, p) => sum + p.principal_amount, 0));
}

/** Total interest collected across the given payments. */
export function totalInterestPaid(payments: Payment[]): number {
  return roundMoney(payments.reduce((sum, p) => sum + p.interest_amount, 0));
}

/**
 * Current outstanding principal = original principal minus everything repaid
 * against principal. Never goes below zero.
 */
export function currentBalance(loan: Loan, payments: Payment[]): number {
  const balance = loan.principal_original - totalPrincipalPaid(payments);
  return roundMoney(Math.max(0, balance));
}

/**
 * A loan is "settled" once it's fully paid off (balance is zero). Settled loans
 * are hidden from the default list view since there's nothing left to collect.
 */
export function isLoanSettled(loan: Loan, payments: Payment[]): boolean {
  return currentBalance(loan, payments) <= 0;
}

/**
 * True when a loan should appear in the default (active) view: still open and
 * still carrying a balance. Manually-closed or fully-paid loans are hidden
 * until the user chooses "show all".
 */
export function isLoanActiveView(loan: Loan, payments: Payment[]): boolean {
  return loan.status === "active" && !isLoanSettled(loan, payments);
}

/**
 * Interest charged for one period on the current balance.
 * e.g. $380,000 at 1% weekly => $3,800 this week.
 */
export function periodInterest(loan: Loan, balance: number): number {
  return roundMoney(balance * loan.interest_rate);
}

/** Human label for a period, used in the UI. */
export function periodLabel(period: InterestPeriod): string {
  return period === "weekly" ? "weekly" : "monthly";
}

export interface ScheduleRow {
  period: number;
  /** ISO date this period's interest is due. */
  dueDate: string;
  openingBalance: number;
  interestDue: number;
}

/**
 * Project the next `count` periods of interest assuming no further principal
 * payments. Purely informational — shows what interest income to expect if the
 * balance stays put.
 */
export function projectSchedule(
  loan: Loan,
  balance: number,
  fromDate: string,
  count: number
): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  const start = new Date(fromDate + "T00:00:00");
  for (let i = 1; i <= count; i++) {
    const due = new Date(start);
    if (loan.interest_period === "weekly") {
      due.setDate(due.getDate() + 7 * i);
    } else {
      due.setMonth(due.getMonth() + i);
    }
    rows.push({
      period: i,
      dueDate: due.toISOString().slice(0, 10),
      openingBalance: balance,
      interestDue: periodInterest(loan, balance),
    });
  }
  return rows;
}

/** Format a number as USD currency. */
export function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

/** Format a fraction rate (0.01) as a percent string ("1%"). */
export function formatRate(rate: number): string {
  return `${roundMoney(rate * 100)}%`;
}

export interface PortfolioSummary {
  totalOutstanding: number;
  totalPeriodInterest: number;
  totalInterestCollected: number;
  totalPrincipalCollected: number;
  activeLoans: number;
}

/**
 * Roll up portfolio-wide totals. `paymentsByLoan` maps a loan id to its
 * payments. Only active loans contribute to outstanding/period interest;
 * collected totals include every loan.
 */
export function summarize(
  loans: Loan[],
  paymentsByLoan: Map<number, Payment[]>
): PortfolioSummary {
  let totalOutstanding = 0;
  let totalPeriodInterest = 0;
  let totalInterestCollected = 0;
  let totalPrincipalCollected = 0;
  let activeLoans = 0;

  for (const loan of loans) {
    const payments = paymentsByLoan.get(loan.id) ?? [];
    totalInterestCollected += totalInterestPaid(payments);
    totalPrincipalCollected += totalPrincipalPaid(payments);
    if (loan.status === "active") {
      const balance = currentBalance(loan, payments);
      totalOutstanding += balance;
      totalPeriodInterest += periodInterest(loan, balance);
      activeLoans += 1;
    }
  }

  return {
    totalOutstanding: roundMoney(totalOutstanding),
    totalPeriodInterest: roundMoney(totalPeriodInterest),
    totalInterestCollected: roundMoney(totalInterestCollected),
    totalPrincipalCollected: roundMoney(totalPrincipalCollected),
    activeLoans,
  };
}
