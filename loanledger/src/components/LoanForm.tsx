import { useState } from "react";
import type { Loan, NewLoan, InterestPeriod } from "../types";

interface Props {
  initial?: Loan;
  onCancel: () => void;
  onSave: (loan: NewLoan) => Promise<void>;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Create/edit form for a loan. Rate is entered as a percent and stored as a fraction. */
export function LoanForm({ initial, onCancel, onSave }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [principal, setPrincipal] = useState(
    initial ? String(initial.principal_original) : ""
  );
  const [ratePct, setRatePct] = useState(
    initial ? String(initial.interest_rate * 100) : "1"
  );
  const [period, setPeriod] = useState<InterestPeriod>(
    initial?.interest_period ?? "weekly"
  );
  const [startDate, setStartDate] = useState(initial?.start_date ?? todayIso());
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    const principalNum = Number(principal);
    const rateNum = Number(ratePct);
    if (!name.trim()) return setError("Borrower name is required.");
    if (!(principalNum > 0)) return setError("Principal must be greater than 0.");
    if (!(rateNum >= 0)) return setError("Interest rate must be 0 or more.");

    setSaving(true);
    setError("");
    try {
      await onSave({
        name: name.trim(),
        principal_original: principalNum,
        interest_rate: rateNum / 100,
        interest_period: period,
        start_date: startDate,
        notes: notes.trim(),
      });
    } catch (e) {
      setError(String(e));
      setSaving(false);
    }
  }

  return (
    <div className="overlay center" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h2>{initial ? "Edit loan" : "New loan"}</h2>
          <button className="close-x" onClick={onCancel}>
            ×
          </button>
        </div>

        <div className="field">
          <label>Borrower / counterparty</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Corp"
            autoFocus
          />
        </div>

        <div className="form-row">
          <div className="field">
            <label>Principal (USD)</label>
            <input
              type="number"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              placeholder="380000"
            />
          </div>
          <div className="field">
            <label>Interest rate (%)</label>
            <input
              type="number"
              step="0.01"
              value={ratePct}
              onChange={(e) => setRatePct(e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label>Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as InterestPeriod)}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="field">
            <label>Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label>Notes</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Terms, contacts, anything useful…"
          />
        </div>

        {error && <div style={{ color: "var(--red)", marginBottom: 12 }}>{error}</div>}

        <div className="actions">
          <button className="btn" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save loan"}
          </button>
          <button className="btn secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
