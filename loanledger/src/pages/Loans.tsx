import { useEffect, useState } from "react";
import type { Loan, Payment, NewLoan } from "../types";
import {
  listLoans,
  listAllPayments,
  groupPaymentsByLoan,
  createLoan,
  updateLoan,
  setLoanStatus,
  deleteLoan,
} from "../db";
import {
  currentBalance,
  periodInterest,
  formatMoney,
  formatRate,
  periodLabel,
} from "../calc";
import { LoanForm } from "../components/LoanForm";
import { LoanDrawer } from "../components/LoanDrawer";

interface Props {
  refreshKey: number;
  onChange: () => void;
  showToast: (m: string) => void;
}

export default function Loans({ refreshKey, onChange, showToast }: Props) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [byLoan, setByLoan] = useState<Map<number, Payment[]>>(new Map());
  const [selected, setSelected] = useState<Loan | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);

  async function load() {
    const [ls, ps] = await Promise.all([listLoans(), listAllPayments()]);
    setLoans(ls);
    setByLoan(groupPaymentsByLoan(ps));
    // Keep the open drawer in sync with refreshed data.
    setSelected((cur) => (cur ? ls.find((l) => l.id === cur.id) ?? null : null));
  }

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  async function handleSave(data: NewLoan) {
    if (editing) {
      await updateLoan(editing.id, data);
      showToast("Loan updated");
    } else {
      await createLoan(data);
      showToast("Loan added");
    }
    setShowForm(false);
    setEditing(null);
    await load();
    onChange();
  }

  async function handleSetStatus(loan: Loan, status: "active" | "closed") {
    await setLoanStatus(loan.id, status);
    await load();
    onChange();
    showToast(status === "closed" ? "Loan closed" : "Loan reopened");
  }

  async function handleDelete(loan: Loan) {
    const ok = window.confirm(
      `Delete "${loan.name}" and all its payments? This cannot be undone.`
    );
    if (!ok) return;
    await deleteLoan(loan.id);
    setSelected(null);
    await load();
    onChange();
    showToast("Loan deleted");
  }

  return (
    <>
      <div className="page-head">
        <h1>Loans</h1>
        <button
          className="btn"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          + New loan
        </button>
      </div>

      {loans.length === 0 ? (
        <div className="empty">No loans yet. Click “New loan” to get started.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Borrower</th>
              <th>Status</th>
              <th>Rate</th>
              <th className="num">Balance</th>
              <th className="num">Interest / period</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((loan) => {
              const payments = byLoan.get(loan.id) ?? [];
              const balance = currentBalance(loan, payments);
              return (
                <tr
                  key={loan.id}
                  className="clickable"
                  onClick={() => setSelected(loan)}
                >
                  <td>{loan.name}</td>
                  <td>
                    <span className={`badge ${loan.status}`}>{loan.status}</span>
                  </td>
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

      {selected && (
        <LoanDrawer
          loan={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            load().catch(() => {});
            onChange();
          }}
          onEdit={(loan) => {
            setEditing(loan);
            setShowForm(true);
          }}
          onSetStatus={handleSetStatus}
          onDelete={handleDelete}
        />
      )}

      {showForm && (
        <LoanForm
          initial={editing ?? undefined}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}
    </>
  );
}
