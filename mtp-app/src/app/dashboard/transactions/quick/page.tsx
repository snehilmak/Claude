'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Company {
  id: string;
  name: string;
  code: string;
}

interface CustomerSuggestion {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface TodayTransaction {
  id: string;
  controlNumber: string | null;
  senderPhone: string | null;
  customer: { firstName: string; lastName: string };
  recipientName: string;
  totalCollected: string | number;
  recipientCountry: string;
  company: { name: string };
  createdAt: string;
}

const COUNTRIES: [string, string][] = [
  ['MX', 'Mexico'], ['GT', 'Guatemala'], ['HN', 'Honduras'], ['SV', 'El Salvador'],
  ['NI', 'Nicaragua'], ['CR', 'Costa Rica'], ['PA', 'Panama'], ['CO', 'Colombia'],
  ['VE', 'Venezuela'], ['PE', 'Peru'], ['EC', 'Ecuador'], ['BO', 'Bolivia'],
  ['DO', 'Dominican Republic'], ['CU', 'Cuba'], ['PH', 'Philippines'],
  ['IN', 'India'], ['CN', 'China'], ['NG', 'Nigeria'], ['GH', 'Ghana'], ['US', 'United States'],
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_FORM = {
  date: todayISO(),
  controlNumber: '',
  senderPhone: '',
  senderName: '',
  recipientName: '',
  amount: '',
  recipientCountry: 'MX',
  companyId: '',
  notes: '',
};

export default function QuickEntryPage() {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [suggestions, setSuggestions] = useState<CustomerSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [todayTxs, setTodayTxs] = useState<TodayTransaction[]>([]);
  const [flash, setFlash] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const folioRef = useRef<HTMLInputElement>(null);
  const phoneDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Load companies and today's transactions on mount
  useEffect(() => {
    fetch('/api/companies')
      .then((r) => r.json())
      .then((d) => setCompanies(d.companies ?? []));

    loadTodayTxs();
  }, []);

  function loadTodayTxs() {
    fetch('/api/transactions/quick?today=true')
      .then((r) => r.json())
      .then((d) => setTodayTxs(d.transactions ?? []));
  }

  // Close suggestion dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const set = useCallback(
    (field: keyof typeof EMPTY_FORM) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm((p) => ({ ...p, [field]: e.target.value }));
      },
    []
  );

  // Phone input with debounce customer search
  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setForm((p) => ({ ...p, senderPhone: val }));
    setSelectedCustomerId(null);

    if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current);

    if (val.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    phoneDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(val.trim())}`);
        const data = await res.json();
        const found: CustomerSuggestion[] = data.customers ?? [];
        setSuggestions(found);
        setShowSuggestions(found.length > 0);
      } catch {
        // silently ignore search errors
      }
    }, 300);
  }

  function selectSuggestion(c: CustomerSuggestion) {
    setSelectedCustomerId(c.id);
    setForm((p) => ({
      ...p,
      senderPhone: c.phone,
      senderName: `${c.firstName} ${c.lastName}`.trim(),
    }));
    setSuggestions([]);
    setShowSuggestions(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyId) {
      setErrorMsg('Please select a company.');
      return;
    }
    setFlash('saving');
    setErrorMsg('');

    try {
      const res = await fetch('/api/transactions/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          controlNumber: form.controlNumber || null,
          senderPhone: form.senderPhone,
          senderName: form.senderName,
          recipientName: form.recipientName,
          recipientCountry: form.recipientCountry,
          companyId: form.companyId,
          amount: parseFloat(form.amount),
          notes: form.notes || null,
          date: form.date,
          ...(selectedCustomerId ? { customerId: selectedCustomerId } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error ?? 'Failed to save transaction.');
        setFlash('error');
        return;
      }

      setFlash('saved');
      loadTodayTxs();

      // Reset form, keep date and company for speed
      setForm((p) => ({
        ...EMPTY_FORM,
        date: p.date,
        companyId: p.companyId,
        recipientCountry: p.recipientCountry,
      }));
      setSelectedCustomerId(null);

      setTimeout(() => {
        setFlash('idle');
        folioRef.current?.focus();
      }, 1500);
    } catch {
      setErrorMsg('Network error. Please try again.');
      setFlash('error');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quick Entry</h1>
          <p className="text-sm text-gray-500">Fast row-based entry — mirrors your Excel workflow</p>
        </div>
        {flash === 'saved' && (
          <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-4 py-2 text-sm font-medium text-green-800">
            Saved! ✓
          </div>
        )}
        {flash === 'error' && errorMsg && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm font-medium text-red-800">
            {errorMsg}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New Transfer Row</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            {/* Single wide row matching Excel column order */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-9">
              {/* 1. Date */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={set('date')}
                  tabIndex={1}
                  className="block w-full rounded-md border border-gray-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* 2. Folio/Seq → controlNumber */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">Folio/Seq</label>
                <input
                  ref={folioRef}
                  type="text"
                  value={form.controlNumber}
                  onChange={set('controlNumber')}
                  placeholder="Folio #"
                  tabIndex={2}
                  className="block w-full rounded-md border border-gray-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* 3. Phone No — with customer lookup dropdown */}
              <div className="relative space-y-1">
                <label className="block text-xs font-medium text-gray-600">Phone No</label>
                <input
                  type="text"
                  value={form.senderPhone}
                  onChange={handlePhoneChange}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="Phone number"
                  tabIndex={3}
                  autoComplete="off"
                  className="block w-full rounded-md border border-gray-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {showSuggestions && (
                  <div
                    ref={suggestionsRef}
                    className="absolute left-0 top-full z-50 mt-1 w-72 rounded-md border border-gray-200 bg-white shadow-lg"
                  >
                    {suggestions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => selectSuggestion(c)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50"
                      >
                        <span className="font-medium text-gray-800">
                          {c.firstName} {c.lastName}
                        </span>
                        <span className="text-gray-400">{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Sender name — auto-filled, editable */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">Sender</label>
                <input
                  type="text"
                  value={form.senderName}
                  onChange={set('senderName')}
                  placeholder="Sender name"
                  required
                  tabIndex={4}
                  className="block w-full rounded-md border border-gray-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* 5. Receiver */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">Receiver</label>
                <input
                  type="text"
                  value={form.recipientName}
                  onChange={set('recipientName')}
                  placeholder="Receiver name"
                  required
                  tabIndex={5}
                  className="block w-full rounded-md border border-gray-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* 6. Amount */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">Amount (USD)</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={set('amount')}
                  placeholder="0.00"
                  required
                  min="0.01"
                  step="0.01"
                  tabIndex={6}
                  className="block w-full rounded-md border border-gray-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* 7. Country */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">Country</label>
                <select
                  value={form.recipientCountry}
                  onChange={set('recipientCountry')}
                  tabIndex={7}
                  className="block w-full rounded-md border border-gray-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {COUNTRIES.map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </select>
              </div>

              {/* 8. Company */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">Company</label>
                <select
                  value={form.companyId}
                  onChange={set('companyId')}
                  required
                  tabIndex={8}
                  className={cn(
                    'block w-full rounded-md border border-gray-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                    !form.companyId && 'text-gray-400'
                  )}
                >
                  <option value="">-- Company --</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* 9. Comment */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">Comment</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={set('notes')}
                  placeholder="Notes..."
                  tabIndex={9}
                  className="block w-full rounded-md border border-gray-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <Button
                type="submit"
                disabled={flash === 'saving'}
                tabIndex={10}
                className="min-w-[160px]"
              >
                {flash === 'saving' ? 'Saving...' : 'Record Transfer'}
              </Button>
              {flash === 'saved' && (
                <span className="text-sm font-medium text-green-700">Saved! ✓ — enter next transfer</span>
              )}
              {flash === 'error' && errorMsg && (
                <span className="text-sm text-red-600">{errorMsg}</span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Today's entries mini table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Today&apos;s Entries
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({todayTxs.length} records)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayTxs.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No entries today yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-gray-500">
                    <th className="pb-2 pr-4 font-medium">Folio</th>
                    <th className="pb-2 pr-4 font-medium">Phone</th>
                    <th className="pb-2 pr-4 font-medium">Sender</th>
                    <th className="pb-2 pr-4 font-medium">Receiver</th>
                    <th className="pb-2 pr-4 font-medium">Amount</th>
                    <th className="pb-2 pr-4 font-medium">Country</th>
                    <th className="pb-2 pr-4 font-medium">Company</th>
                    <th className="pb-2 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {todayTxs.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="py-2 pr-4 font-mono text-xs text-gray-500">
                        {tx.controlNumber ?? '—'}
                      </td>
                      <td className="py-2 pr-4 text-gray-600">{tx.senderPhone ?? '—'}</td>
                      <td className="py-2 pr-4 font-medium text-gray-900">
                        {tx.customer.firstName} {tx.customer.lastName}
                      </td>
                      <td className="py-2 pr-4 text-gray-600">{tx.recipientName}</td>
                      <td className="py-2 pr-4 font-medium">
                        ${Number(tx.totalCollected).toFixed(2)}
                      </td>
                      <td className="py-2 pr-4 text-gray-500">{tx.recipientCountry}</td>
                      <td className="py-2 pr-4 text-gray-600">{tx.company.name}</td>
                      <td className="py-2 text-gray-400 text-xs">
                        {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
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
