'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, statusBadgeVariant } from '@/components/ui/badge';

interface Tx {
  id: string;
  controlNumber: string | null;
  referenceNumber: string | null;
  customer: { firstName: string; lastName: string };
  senderPhone: string | null;
  recipientName: string;
  recipientCountry: string;
  company: { name: string };
  sendAmount: string | number;
  receiveAmount: string | number | null;
  receiveCurrency: string | null;
  fee: string | number;
  totalCollected: string | number;
  paymentMethod: string;
  status: string;
  cancelReason: string | null;
  cancelledAt: string | null;
  refundDate: string | null;
  refundVerified: boolean;
  notes: string | null;
  agent: { name: string };
  location: { name: string };
  createdAt: string;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmt = (n: string | number) => `$${Number(n).toFixed(2)}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString();
const fmtTime = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function TransactionsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [year] = useState(now.getFullYear());
  const [status, setStatus] = useState('');
  const [company, setCompany] = useState('');
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllLocations, setShowAllLocations] = useState(false);

  // Action state
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [refundId, setRefundId] = useState<string | null>(null);
  const [refundDate, setRefundDate] = useState(new Date().toISOString().slice(0, 10));
  const [refundVerified, setRefundVerified] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const from = new Date(year, month, 1).toISOString().slice(0, 10);
    const to = new Date(year, month + 1, 0).toISOString().slice(0, 10);
    const params = new URLSearchParams({ from, to });
    if (status) params.set('status', status);
    if (company) params.set('company', company);
    const res = await fetch(`/api/transactions?${params}`);
    const data = await res.json();
    setTransactions(data.transactions ?? []);
    // Detect all-locations mode from first tx
    if (data.transactions?.length > 1) {
      const names = new Set(data.transactions.map((t: Tx) => t.location?.name));
      setShowAllLocations(names.size > 1);
    }
    setLoading(false);
  }, [month, year, status, company]);

  useEffect(() => {
    fetch('/api/companies').then(r => r.json()).then(d => setCompanies(d.companies ?? []));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleCancel(id: string) {
    setSaving(true);
    await fetch(`/api/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED', cancelReason, cancelledAt: new Date().toISOString() }),
    });
    setCancelId(null);
    setCancelReason('');
    setSaving(false);
    fetchData();
  }

  async function handleRefund(id: string) {
    setSaving(true);
    await fetch(`/api/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refundDate, refundVerified }),
    });
    setRefundId(null);
    setSaving(false);
    fetchData();
  }

  const totalAmount = transactions.reduce((s, t) => s + Number(t.totalCollected), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500">
            {transactions.length} records — {fmt(totalAmount)} total — {MONTHS[month]} {year}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/transactions/quick">
            <Button variant="secondary" size="sm">⚡ Quick Entry</Button>
          </Link>
          <Link href="/dashboard/transactions/new">
            <Button size="sm">+ Detailed Entry</Button>
          </Link>
        </div>
      </div>

      {/* Monthly tabs — mirrors Excel tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 pb-0">
        {MONTHS.map((m, i) => (
          <button
            key={m}
            onClick={() => setMonth(i)}
            className={`px-3 py-1.5 text-sm font-medium rounded-t-md border-b-2 transition-colors whitespace-nowrap ${
              i === month
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {m} {String(year).slice(2)}
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Company</label>
              <select value={company} onChange={e => setCompany(e.target.value)} className="rounded border border-gray-300 px-2 py-1 text-sm">
                <option value="">All Companies</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="rounded border border-gray-300 px-2 py-1 text-sm">
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="SENT">Sent</option>
                <option value="PAID">Paid</option>
                <option value="HELD">Held</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" size="sm" onClick={() => { setStatus(''); setCompany(''); }}>Clear</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle>Records — {MONTHS[month]} {year}</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-gray-400">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="py-10 text-center text-gray-400">No transactions for {MONTHS[month]} {year}.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500 text-xs">
                    <th className="pb-2 font-medium">Folio/Seq</th>
                    <th className="pb-2 font-medium">Phone</th>
                    <th className="pb-2 font-medium">Sender</th>
                    <th className="pb-2 font-medium">Receiver</th>
                    <th className="pb-2 font-medium">Amount</th>
                    <th className="pb-2 font-medium">Country</th>
                    <th className="pb-2 font-medium">Company</th>
                    <th className="pb-2 font-medium">Comment</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Cancelled</th>
                    <th className="pb-2 font-medium">Refund</th>
                    {showAllLocations && <th className="pb-2 font-medium">Location</th>}
                    <th className="pb-2 font-medium">Agent</th>
                    <th className="pb-2 font-medium">Time</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((tx) => (
                    <>
                      <tr key={tx.id} className={`hover:bg-gray-50 ${tx.status === 'CANCELLED' ? 'opacity-60' : ''}`}>
                        <td className="py-2 font-mono text-xs text-gray-600">
                          {tx.controlNumber ?? tx.referenceNumber ?? tx.id.slice(-6)}
                        </td>
                        <td className="py-2 text-gray-600">{tx.senderPhone ?? tx.customer?.firstName ? '' : '—'}</td>
                        <td className="py-2 font-medium text-gray-900">
                          {tx.customer.firstName} {tx.customer.lastName}
                        </td>
                        <td className="py-2 text-gray-700">{tx.recipientName}</td>
                        <td className="py-2 font-medium text-gray-900">{fmt(tx.totalCollected)}</td>
                        <td className="py-2 text-gray-500">{tx.recipientCountry}</td>
                        <td className="py-2 text-gray-600">{tx.company.name}</td>
                        <td className="py-2 text-gray-400 text-xs max-w-24 truncate">{tx.notes ?? '—'}</td>
                        <td className="py-2">
                          <Badge variant={statusBadgeVariant(tx.status)}>{tx.status}</Badge>
                        </td>
                        <td className="py-2 text-xs text-red-600">
                          {tx.cancelledAt ? fmtDate(tx.cancelledAt) : '—'}
                          {tx.cancelReason && <div className="text-gray-400">{tx.cancelReason}</div>}
                        </td>
                        <td className="py-2 text-xs">
                          {tx.refundDate ? (
                            <div>
                              <span className="text-purple-700">{fmtDate(tx.refundDate)}</span>
                              <div className={tx.refundVerified ? 'text-green-600 font-medium' : 'text-yellow-600'}>
                                {tx.refundVerified ? '✓ Verified' : '⚠ Unverified'}
                              </div>
                            </div>
                          ) : '—'}
                        </td>
                        {showAllLocations && <td className="py-2 text-xs text-gray-400">{tx.location?.name}</td>}
                        <td className="py-2 text-xs text-gray-400">{tx.agent.name}</td>
                        <td className="py-2 text-xs text-gray-400">{fmtTime(tx.createdAt)}</td>
                        <td className="py-2">
                          {tx.status !== 'CANCELLED' && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => { setCancelId(cancelId === tx.id ? null : tx.id); setRefundId(null); }}
                                className="rounded px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"
                              >Cancel</button>
                              <button
                                onClick={() => { setRefundId(refundId === tx.id ? null : tx.id); setCancelId(null); }}
                                className="rounded px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200"
                              >Refund</button>
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Cancel inline form */}
                      {cancelId === tx.id && (
                        <tr key={`${tx.id}-cancel`}>
                          <td colSpan={showAllLocations ? 15 : 14} className="bg-red-50 px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-red-700">Cancel reason:</span>
                              <input
                                type="text"
                                value={cancelReason}
                                onChange={e => setCancelReason(e.target.value)}
                                placeholder="Customer request, duplicate, etc."
                                className="flex-1 rounded border border-red-300 px-2 py-1 text-sm"
                                autoFocus
                              />
                              <button
                                onClick={() => handleCancel(tx.id)}
                                disabled={saving}
                                className="rounded bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                              >
                                {saving ? 'Saving...' : 'Confirm Cancel'}
                              </button>
                              <button onClick={() => setCancelId(null)} className="text-sm text-gray-500 hover:text-gray-700">×</button>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Refund inline form */}
                      {refundId === tx.id && (
                        <tr key={`${tx.id}-refund`}>
                          <td colSpan={showAllLocations ? 15 : 14} className="bg-purple-50 px-4 py-3">
                            <div className="flex items-center gap-4 flex-wrap">
                              <span className="text-sm font-medium text-purple-700">Refund Date:</span>
                              <input
                                type="date"
                                value={refundDate}
                                onChange={e => setRefundDate(e.target.value)}
                                className="rounded border border-purple-300 px-2 py-1 text-sm"
                              />
                              <label className="flex items-center gap-2 text-sm text-purple-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={refundVerified}
                                  onChange={e => setRefundVerified(e.target.checked)}
                                  className="h-4 w-4"
                                />
                                Refund Verified
                              </label>
                              <button
                                onClick={() => handleRefund(tx.id)}
                                disabled={saving}
                                className="rounded bg-purple-600 px-3 py-1 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                              >
                                {saving ? 'Saving...' : 'Save Refund'}
                              </button>
                              <button onClick={() => setRefundId(null)} className="text-sm text-gray-500 hover:text-gray-700">×</button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
