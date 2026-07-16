import { useEffect, useState } from "react";
import type { Loan, Payment } from "../types";
import { listPayments, createPayment, deletePayment } from "../db";
import {
  currentBalance,
  periodInterest,
  totalInterestPaid,
  totalPrincipalPaid,
  projectSchedule,
  formatMoney,
  formatRate,
  periodLabel,
} from "../calc";

interface Props {
  loan: Loan;
  onClose: () => void;
  onChanged: () => void;
  onEdit: (loan: Loan) => void;
  onSetStatus: (loan: Loan, status: "active" | "closed") => void;
  onDelete: (loan: Loan) => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function LoanDrawer({
  loan,
  onClose,
  onChanged,
  onEdit,
  onSetStatus,
  onDelete,
}: Props) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [date, setDate] = useState(todayIso());
  const [interest, setInterest] = useState("");
  const [principal, setPrincipal] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const balance = currentBalance(loan, payments);
  const dueThisPeriod = periodInterest(loan, balance);

  async function load() {
    setPayments(await listPayments(loan.id));
  }

  useEffect(() => {
    load().catch(() => {});
    // Pre-fill the interest field with what's due this period for convenience.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loan.id]);

  // Suggest the computed interest once payments load, if the field is empty.
  useEffect(() => {
    if (interest === "" && dueThisPeriod > 0) setInterest(String(dueThisPeriod));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueThisPeriod]);

  async function recordPayment() {
    const interestNum = Number(interest) || 0;
    const principalNum = Number(principal) || 0;
    if (interestNum <= 0 && principalNum <= 0) return;
    setSaving(true);
    try {
      await createPayment({
        loan_id: loan.id,
        date,
        interest_amount: interestNum,
        principal_amount: principalNum,
        note: note.trim(),
      });
      setInterest("");
      setPrincipal("");
      setNote("");
      await load();
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function removePayment(id: number) {
    await deletePayment(id);
    await load();
    onChanged();
  }

  const schedule = projectSchedule(loan, balance, todayIso(), 4);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <h2>{loan.name}</h2>
            <span className={`badge ${loan.status}`}>{loan.status}</span>
          </div>
          <button className="close-x" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="grid-2 kv">
          <div>
            <div className="k">Outstanding balance</div>
            <div className="v">{formatMoney(balance)}</div>
          </div>
          <div>
            <div className="k">Interest due / {periodLabel(loan.interest_period)}</div>
            <div className="v">{formatMoney(dueThisPeriod)}</div>
          </div>
          <div>
            <div className="k">Rate</div>
            <div className="v">
              {formatRate(loan.interest_rate)} {periodLabel(loan.interest_period)}
            </div>
          </div>
          <div>
            <div className="k">Original principal</div>
            <div className="v">{formatMoney(loan.principal_original)}</div>
          </div>
          <div>
            <div className="k">Interest collected</div>
            <div className="v">{formatMoney(totalInterestPaid(payments))}</div>
          </div>
          <div>
            <div className="k">Principal repaid</div>
            <div className="v">{formatMoney(totalPrincipalPaid(payments))}</div>
          </div>
        </div>

        {(loan.phone || loan.email) && (
          <p className="muted contact-line">
            {loan.phone && <span>📞 {loan.phone}</span>}
            {loan.email && (
              <span>
                ✉️ <a href={`mailto:${loan.email}`}>{loan.email}</a>
              </span>
            )}
          </p>
        )}

        {loan.notes && <p className="muted">{loan.notes}</p>}

        {loan.status === "active" && (
          <>
            <div className="section-title">Record a payment</div>
            <div className="form-row">
              <div className="field">
                <label>Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Interest (USD)</label>
                <input
                  type="number"
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                  placeholder={String(dueThisPeriod)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Principal paydown (USD)</label>
                <input
                  type="number"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="field">
                <label>Note</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="optional"
                />
              </div>
            </div>
            <button className="btn" onClick={recordPayment} disabled={saving}>
              {saving ? "Saving…" : "Add payment"}
            </button>
          </>
        )}

        <div className="section-title">Payment history</div>
        {payments.length === 0 ? (
          <p className="muted">No payments recorded yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th className="num">Interest</th>
                <th className="num">Principal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.date}
                    {p.note ? <div className="muted">{p.note}</div> : null}
                  </td>
                  <td className="num">{formatMoney(p.interest_amount)}</td>
                  <td className="num">{formatMoney(p.principal_amount)}</td>
                  <td className="num">
                    <button
                      className="btn small danger"
                      onClick={() => removePayment(p.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {loan.status === "active" && balance > 0 && (
          <>
            <div className="section-title">Projected interest (flat balance)</div>
            <table>
              <thead>
                <tr>
                  <th>Due date</th>
                  <th className="num">Balance</th>
                  <th className="num">Interest</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row) => (
                  <tr key={row.period}>
                    <td>{row.dueDate}</td>
                    <td className="num">{formatMoney(row.openingBalance)}</td>
                    <td className="num">{formatMoney(row.interestDue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div className="actions" style={{ marginTop: 24 }}>
          <button className="btn secondary" onClick={() => onEdit(loan)}>
            Edit
          </button>
          {loan.status === "active" ? (
            <button
              className="btn secondary"
              onClick={() => onSetStatus(loan, "closed")}
            >
              Mark closed
            </button>
          ) : (
            <button
              className="btn secondary"
              onClick={() => onSetStatus(loan, "active")}
            >
              Reopen
            </button>
          )}
          <div className="spacer" />
          <button className="btn danger" onClick={() => onDelete(loan)}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
