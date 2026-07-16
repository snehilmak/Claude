// Domain types for LoanLedger.

/** How often interest is charged on a loan. */
export type InterestPeriod = "weekly" | "monthly";

export type LoanStatus = "active" | "closed";

export interface Loan {
  id: number;
  /** Borrower / counterparty name, e.g. "Acme Corp". */
  name: string;
  /** Original principal disbursed, in dollars. */
  principal_original: number;
  /** Interest rate per period as a fraction, e.g. 0.01 for 1%. */
  interest_rate: number;
  interest_period: InterestPeriod;
  /** ISO date (YYYY-MM-DD) the loan started. */
  start_date: string;
  status: LoanStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

/**
 * A single ledger entry against a loan. A payment can include an interest
 * portion (income to us) and/or a principal portion (which reduces the
 * outstanding balance and therefore future interest).
 */
export interface Payment {
  id: number;
  loan_id: number;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  interest_amount: number;
  principal_amount: number;
  note: string;
  created_at: string;
}

/** Input shape for creating a loan (no generated fields). */
export interface NewLoan {
  name: string;
  principal_original: number;
  interest_rate: number;
  interest_period: InterestPeriod;
  start_date: string;
  notes: string;
}

/** Input shape for recording a payment. */
export interface NewPayment {
  loan_id: number;
  date: string;
  interest_amount: number;
  principal_amount: number;
  note: string;
}

/** Direction of a cash ledger entry: money received ("in") or paid out ("out"). */
export type LedgerDirection = "in" | "out";

/**
 * One cash movement in the general money ledger, tied to a person/account by
 * name. Independent of loans — this mirrors a simple "funds in / funds out"
 * spreadsheet.
 */
export interface LedgerEntry {
  id: number;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Person or account the cash moved to/from, e.g. "MAIN OFFICE". */
  name: string;
  direction: LedgerDirection;
  amount: number;
  note: string;
  created_at: string;
}

/** Input shape for creating a ledger entry. */
export interface NewLedgerEntry {
  date: string;
  name: string;
  direction: LedgerDirection;
  amount: number;
  note: string;
}
