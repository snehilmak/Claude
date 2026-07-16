import { useEffect, useMemo, useState } from "react";
import type { Loan, Payment, LedgerEntry } from "../types";
import {
  listLoans,
  listAllPayments,
  listLedgerEntries,
  groupPaymentsByLoan,
} from "../db";
import {
  summarize,
  currentBalance,
  periodInterest,
  projectSchedule,
  formatMoney,
  type PortfolioSummary,
} from "../calc";
import { summarizeLedger } from "../ledger";
import {
  byBorrower,
  monthlyTotals,
  totalPrincipalRepaid,
  type BorrowerRow,
} from "../dashboard";

interface Props {
  refreshKey: number;
  onOpenLoans: () => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 'YYYY-MM' -> 'Jan 26' for compact chart labels. */
function formatMonth(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return `${d.toLocaleString("en-US", { month: "short" })} ${String(y).slice(2)}`;
}

export default function Dashboard({ refreshKey, onOpenLoans }: Props) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [byLoan, setByLoan] = useState<Map<number, Payment[]>>(new Map());
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);

  useEffect(() => {
    (async () => {
      const [ls, ps, le] = await Promise.all([
        listLoans(),
        listAllPayments(),
        listLedgerEntries(),
      ]);
      const grouped = groupPaymentsByLoan(ps);
      setLoans(ls);
      setByLoan(grouped);
      setLedger(le);
      setSummary(summarize(ls, grouped));
    })().catch(() => {});
  }, [refreshKey]);

  const allPayments = useMemo(
    () => [...byLoan.values()].flat(),
    [byLoan]
  );
  const cash = useMemo(() => summarizeLedger(ledger), [ledger]);
  const borrowers = useMemo(() => byBorrower(loans, byLoan), [loans, byLoan]);
  const months = useMemo(
    () => monthlyTotals(allPayments, todayIso(), 6),
    [allPayments]
  );
  const principalRepaid = useMemo(
    () => totalPrincipalRepaid(byLoan),
    [byLoan]
  );

  const collectedThisMonth = months.length
    ? months[months.length - 1].interest
    : 0;
  const activeBorrowers = borrowers.filter((b) => b.activeCount > 0);
  const exposure = borrowers.filter((b) => b.outstanding > 0);
  const maxMonth = Math.max(1, ...months.map((m) => m.interest));

  // Active loans still carrying a balance, with their next interest due date.
  const upcoming = loans
    .filter((l) => l.status === "active")
    .map((l) => {
      const balance = currentBalance(l, byLoan.get(l.id) ?? []);
      return { loan: l, balance, due: periodInterest(l, balance) };
    })
    .filter((r) => r.balance > 0)
    .sort((a, b) => b.due - a.due);

  return (
    <>
      <div className="page-head">
        <h1>Dashboard</h1>
      </div>

      <div className="cards">
        <div className="card">
          <div className="label">Outstanding principal</div>
          <div className="value accent">
            {formatMoney(summary?.totalOutstanding ?? 0)}
          </div>
        </div>
        <div className="card">
          <div className="label">Interest due / period</div>
          <div className="value">
            {formatMoney(summary?.totalPeriodInterest ?? 0)}
          </div>
        </div>
        <div className="card">
          <div className="label">Collected this month</div>
          <div className="value green">{formatMoney(collectedThisMonth)}</div>
        </div>
        <div className="card">
          <div className="label">Interest collected (all time)</div>
          <div className="value green">
            {formatMoney(summary?.totalInterestCollected ?? 0)}
          </div>
        </div>
        <div className="card">
          <div className="label">Principal repaid</div>
          <div className="value">{formatMoney(principalRepaid)}</div>
        </div>
        <div className="card">
          <div className="label">Net cash (ledger)</div>
          <div className={`value ${cash.net >= 0 ? "accent" : ""}`}>
            {formatMoney(cash.net)}
          </div>
        </div>
        <div className="card">
          <div className="label">Active loans</div>
          <div className="value">{summary?.activeLoans ?? 0}</div>
        </div>
        <div className="card">
          <div className="label">Active borrowers</div>
          <div className="value">{activeBorrowers.length}</div>
        </div>
      </div>

      {loans.length === 0 && ledger.length === 0 ? (
        <div className="empty">
          Nothing to show yet.{" "}
          <button className="btn small" onClick={onOpenLoans}>
            Add your first loan
          </button>{" "}
          or import your ledger from Settings.
        </div>
      ) : (
        <>
          <div className="section-title">Interest collected — last 6 months</div>
          {months.every((m) => m.interest === 0) ? (
            <p className="muted">No interest recorded in this window yet.</p>
          ) : (
            <div className="barchart">
              {months.map((m) => (
                <div className="bar" key={m.month}>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ height: `${(m.interest / maxMonth) * 100}%` }}
                      title={formatMoney(m.interest)}
                    />
                  </div>
                  <div className="bar-value">
                    {m.interest ? formatMoney(m.interest) : ""}
                  </div>
                  <div className="bar-label">{formatMonth(m.month)}</div>
                </div>
              ))}
            </div>
          )}

          {exposure.length > 0 && (
            <>
              <div className="section-title">By borrower — who owes what</div>
              <table>
                <thead>
                  <tr>
                    <th>Borrower</th>
                    <th className="num">Loans</th>
                    <th className="num">Outstanding</th>
                    <th className="num">Interest / period</th>
                    <th className="num">Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {exposure.map((b: BorrowerRow) => (
                    <tr key={b.name}>
                      <td>{b.name}</td>
                      <td className="num">{b.activeCount}</td>
                      <td className="num">{formatMoney(b.outstanding)}</td>
                      <td className="num">{formatMoney(b.periodInterest)}</td>
                      <td className="num">{formatMoney(b.interestCollected)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {upcoming.length > 0 && (
            <>
              <div className="section-title">Upcoming interest due</div>
              <table>
                <thead>
                  <tr>
                    <th>Borrower</th>
                    <th className="num">Balance</th>
                    <th className="num">Interest due</th>
                    <th>Next due</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map(({ loan, balance, due }) => {
                    const next = projectSchedule(loan, balance, todayIso(), 1)[0];
                    return (
                      <tr key={loan.id}>
                        <td>{loan.name}</td>
                        <td className="num">{formatMoney(balance)}</td>
                        <td className="num">{formatMoney(due)}</td>
                        <td>{next ? next.dueDate : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </>
      )}
    </>
  );
}
