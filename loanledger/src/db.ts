// Thin data-access layer over the SQLite database exposed by tauri-plugin-sql.
// Schema/migrations live in src-tauri (Rust) so they run before the app loads.

import Database from "@tauri-apps/plugin-sql";
import type {
  Loan,
  Payment,
  NewLoan,
  NewPayment,
  LedgerEntry,
  NewLedgerEntry,
} from "./types";

const DB_URL = "sqlite:loanledger.db";

let dbPromise: Promise<Database> | null = null;

function db(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL);
  }
  return dbPromise;
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function listLoans(): Promise<Loan[]> {
  const conn = await db();
  return conn.select<Loan[]>(
    "SELECT * FROM loans ORDER BY status = 'closed', name COLLATE NOCASE"
  );
}

export async function getLoan(id: number): Promise<Loan | null> {
  const conn = await db();
  const rows = await conn.select<Loan[]>("SELECT * FROM loans WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function createLoan(loan: NewLoan): Promise<number> {
  const conn = await db();
  const ts = nowIso();
  const res = await conn.execute(
    `INSERT INTO loans
       (name, principal_original, interest_rate, interest_period, start_date, status, notes, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $7)`,
    [
      loan.name,
      loan.principal_original,
      loan.interest_rate,
      loan.interest_period,
      loan.start_date,
      loan.notes,
      ts,
    ]
  );
  return res.lastInsertId as number;
}

export async function updateLoan(
  id: number,
  fields: Partial<NewLoan> & { status?: string }
): Promise<void> {
  const conn = await db();
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, value] of Object.entries(fields)) {
    sets.push(`${key} = $${i++}`);
    values.push(value);
  }
  if (sets.length === 0) return;
  sets.push(`updated_at = $${i++}`);
  values.push(nowIso());
  values.push(id);
  await conn.execute(
    `UPDATE loans SET ${sets.join(", ")} WHERE id = $${i}`,
    values
  );
}

export async function setLoanStatus(id: number, status: "active" | "closed"): Promise<void> {
  await updateLoan(id, { status });
}

export async function deleteLoan(id: number): Promise<void> {
  const conn = await db();
  await conn.execute("DELETE FROM payments WHERE loan_id = $1", [id]);
  await conn.execute("DELETE FROM loans WHERE id = $1", [id]);
}

export async function listPayments(loanId: number): Promise<Payment[]> {
  const conn = await db();
  return conn.select<Payment[]>(
    "SELECT * FROM payments WHERE loan_id = $1 ORDER BY date DESC, id DESC",
    [loanId]
  );
}

export async function listAllPayments(): Promise<Payment[]> {
  const conn = await db();
  return conn.select<Payment[]>("SELECT * FROM payments");
}

export async function createPayment(payment: NewPayment): Promise<number> {
  const conn = await db();
  const res = await conn.execute(
    `INSERT INTO payments
       (loan_id, date, interest_amount, principal_amount, note, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      payment.loan_id,
      payment.date,
      payment.interest_amount,
      payment.principal_amount,
      payment.note,
      nowIso(),
    ]
  );
  return res.lastInsertId as number;
}

export async function deletePayment(id: number): Promise<void> {
  const conn = await db();
  await conn.execute("DELETE FROM payments WHERE id = $1", [id]);
}

export async function listLedgerEntries(): Promise<LedgerEntry[]> {
  const conn = await db();
  return conn.select<LedgerEntry[]>(
    "SELECT * FROM ledger_entries ORDER BY date DESC, id DESC"
  );
}

export async function createLedgerEntry(entry: NewLedgerEntry): Promise<number> {
  const conn = await db();
  const res = await conn.execute(
    `INSERT INTO ledger_entries (date, name, direction, amount, note, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [entry.date, entry.name, entry.direction, entry.amount, entry.note, nowIso()]
  );
  return res.lastInsertId as number;
}

/** Insert many entries (used by import). Returns how many were written. */
export async function createLedgerEntries(entries: NewLedgerEntry[]): Promise<number> {
  for (const entry of entries) {
    await createLedgerEntry(entry);
  }
  return entries.length;
}

export async function deleteLedgerEntry(id: number): Promise<void> {
  const conn = await db();
  await conn.execute("DELETE FROM ledger_entries WHERE id = $1", [id]);
}

/** Group every payment by loan id — handy for portfolio rollups. */
export function groupPaymentsByLoan(payments: Payment[]): Map<number, Payment[]> {
  const map = new Map<number, Payment[]>();
  for (const p of payments) {
    const list = map.get(p.loan_id);
    if (list) list.push(p);
    else map.set(p.loan_id, [p]);
  }
  return map;
}
