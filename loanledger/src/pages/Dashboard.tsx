import { useEffect, useState } from "react";
import type { Loan, Payment } from "../types";
import { listLoans, listAllPayments, groupPaymentsByLoan } from "../db";
import {
  summarize,
  currentBalance,
  periodInterest,
  formatMoney,
  formatRate,
  periodLabel,
  type PortfolioSummary,
} from "../calc";

interface Props {
  refreshKey: number;
  onOpenLoans: () => void;
}

export default function Dashboard({ refreshKey, onOpenLoans }: Props) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [byLoan, setByLoan] = useState<Map<number, Payment[]>>(new Map());
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);

  useEffect(() => {
    (async () => {
      const [ls, ps] = await Promise.all([listLoans(), listAllPayments()]);
      const grouped = groupPaymentsByLoan(ps);
      setLoans(ls);
      setByLoan(grouped);
      setSummary(summarize(ls, grouped));
    })().catch(() => {});
  }, [refreshKey]);

  const active = loans.filter((l) => l.status === "active");

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
          <div className="value">{formatMoney(summary?.totalPeriodInterest ?? 0)}</div>
        </div>
        <div className="card">
          <div className="label">Interest collected</div>
          <div className="value green">
            {formatMoney(summary?.totalInterestCollected ?? 0)}
          </div>
        </div>
        <div className="card">
          <div className="label">Active loans</div>
          <div className="value">{summary?.activeLoans ?? 0}</div>
        </div>
      </div>

      <div className="section-title">Active loans — this period</div>
      {active.length === 0 ? (
        <div className="empty">
          No active loans yet.{" "}
          <button className="btn small" onClick={onOpenLoans}>
            Add your first loan
          </button>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Borrower</th>
              <th>Rate</th>
              <th className="num">Balance</th>
              <th className="num">Interest due</th>
            </tr>
          </thead>
          <tbody>
            {active.map((loan) => {
              const payments = byLoan.get(loan.id) ?? [];
              const balance = currentBalance(loan, payments);
              return (
                <tr key={loan.id}>
                  <td>{loan.name}</td>
                  <td>
                    {formatRate(loan.interest_rate)} {periodLabel(loan.interest_period)}
                  </td>
                  <td className="num">{formatMoney(balance)}</td>
                  <td className="num">{formatMoney(periodInterest(loan, balance))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
