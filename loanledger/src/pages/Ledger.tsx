import { useEffect, useMemo, useState } from "react";
import type { LedgerEntry, NewLedgerEntry, LedgerDirection } from "../types";
import {
  listLedgerEntries,
  createLedgerEntry,
  deleteLedgerEntry,
} from "../db";
import { balancesByName, summarizeLedger, knownNames } from "../ledger";
import { formatMoney } from "../calc";

interface Props {
  refreshKey: number;
  onChange: () => void;
  showToast: (m: string) => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function Ledger({ refreshKey, onChange, showToast }: Props) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [nameFilter, setNameFilter] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Entry form state
  const [date, setDate] = useState(todayIso());
  const [name, setName] = useState("");
  const [direction, setDirection] = useState<LedgerDirection>("in");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setEntries(await listLedgerEntries());
  }

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const summary = useMemo(() => summarizeLedger(entries), [entries]);
  const balances = useMemo(() => balancesByName(entries), [entries]);
  const names = useMemo(() => knownNames(entries), [entries]);
  const visible = nameFilter
    ? entries.filter((e) => e.name === nameFilter)
    : entries;

  async function addEntry() {
    const amountNum = Number(amount);
    if (!name.trim()) return setError("Name is required.");
    if (!(amountNum >= 0) || amount.trim() === "")
      return setError("Amount must be 0 or more.");
    setSaving(true);
    setError("");
    try {
      const entry: NewLedgerEntry = {
        date,
        name: name.trim(),
        direction,
        amount: amountNum,
        note: note.trim(),
      };
      await createLedgerEntry(entry);
      setAmount("");
      setNote("");
      setShowForm(false);
      await load();
      onChange();
      showToast("Entry added");
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function removeEntry(id: number) {
    await deleteLedgerEntry(id);
    await load();
    onChange();
    showToast("Entry deleted");
  }

  return (
    <>
      <div className="page-head">
        <h1>Ledger</h1>
        <button className="btn" onClick={() => setShowForm(true)}>
          + New entry
        </button>
      </div>

      <div className="cards">
        <div className="card">
          <div className="label">Cash in</div>
          <div className="value green">{formatMoney(summary.totalIn)}</div>
        </div>
        <div className="card">
          <div className="label">Cash out</div>
          <div className="value">{formatMoney(summary.totalOut)}</div>
        </div>
        <div className="card">
          <div className="label">Net balance</div>
          <div className={`value ${summary.net >= 0 ? "accent" : ""}`}>
            {formatMoney(summary.net)}
          </div>
        </div>
        <div className="card">
          <div className="label">People / accounts</div>
          <div className="value">{summary.contacts}</div>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="empty">
          No ledger entries yet. Add one with “New entry”, or import your
          spreadsheet from Settings → Import.
        </div>
      ) : (
        <>
          <div className="section-title">Balances by person</div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th className="num">In</th>
                <th className="num">Out</th>
                <th className="num">Net</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((b) => (
                <tr
                  key={b.name}
                  className="clickable"
                  onClick={() =>
                    setNameFilter(nameFilter === b.name ? null : b.name)
                  }
                  style={
                    nameFilter === b.name
                      ? { background: "var(--accent-dim)" }
                      : undefined
                  }
                >
                  <td>{b.name}</td>
                  <td className="num">{formatMoney(b.totalIn)}</td>
                  <td className="num">{formatMoney(b.totalOut)}</td>
                  <td
                    className="num"
                    style={{ color: b.net < 0 ? "var(--red)" : "var(--green)" }}
                  >
                    {formatMoney(b.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="section-title">
            Transactions{nameFilter ? ` — ${nameFilter}` : ""}
            {nameFilter && (
              <>
                {" "}
                <button
                  className="btn small secondary"
                  onClick={() => setNameFilter(null)}
                >
                  Show all
                </button>
              </>
            )}
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                <th>Type</th>
                <th className="num">Amount</th>
                <th>Note</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((e) => (
                <tr key={e.id}>
                  <td>{e.date}</td>
                  <td>{e.name}</td>
                  <td>
                    <span className={`badge ${e.direction === "in" ? "active" : "closed"}`}>
                      {e.direction === "in" ? "Cash in" : "Cash out"}
                    </span>
                  </td>
                  <td className="num">{formatMoney(e.amount)}</td>
                  <td className="muted">{e.note}</td>
                  <td className="num">
                    <button
                      className="btn small danger"
                      onClick={() => removeEntry(e.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {showForm && (
        <div className="overlay center" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <h2>New ledger entry</h2>
              <button className="close-x" onClick={() => setShowForm(false)}>
                ×
              </button>
            </div>

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
                <label>Type</label>
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value as LedgerDirection)}
                >
                  <option value="in">Cash in (received)</option>
                  <option value="out">Cash out (paid)</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="field">
                <label>Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  list="ledger-names"
                  placeholder="Who is this to/from?"
                  autoFocus
                />
                <datalist id="ledger-names">
                  {names.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </div>
              <div className="field">
                <label>Amount (USD)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1000"
                />
              </div>
            </div>

            <div className="field">
              <label>Note</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="optional"
              />
            </div>

            {error && (
              <div style={{ color: "var(--red)", marginBottom: 12 }}>{error}</div>
            )}

            <div className="actions">
              <button className="btn" onClick={addEntry} disabled={saving}>
                {saving ? "Saving…" : "Add entry"}
              </button>
              <button
                className="btn secondary"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
