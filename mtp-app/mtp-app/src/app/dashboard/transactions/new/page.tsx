'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface Company {
  id: string;
  name: string;
  code: string;
}

const COUNTRIES: [string, string][] = [
  ['MX', 'Mexico'], ['GT', 'Guatemala'], ['HN', 'Honduras'], ['SV', 'El Salvador'],
  ['NI', 'Nicaragua'], ['CR', 'Costa Rica'], ['PA', 'Panama'], ['CO', 'Colombia'],
  ['VE', 'Venezuela'], ['PE', 'Peru'], ['EC', 'Ecuador'], ['BO', 'Bolivia'],
  ['DO', 'Dominican Republic'], ['CU', 'Cuba'], ['PR', 'Puerto Rico'],
  ['PH', 'Philippines'], ['IN', 'India'], ['CN', 'China'], ['NG', 'Nigeria'],
  ['GH', 'Ghana'], ['US', 'United States'],
];

export default function NewTransactionPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    customerId: '',
    recipientName: '',
    recipientPhone: '',
    recipientCity: '',
    recipientCountry: 'MX',
    companyId: '',
    sendAmount: '',
    exchangeRate: '',
    fee: '',
    paymentMethod: 'CASH',
    referenceNumber: '',
    controlNumber: '',
    purposeOfTransfer: 'Family Support',
    sourceOfFunds: 'Employment',
    notes: '',
  });

  const receiveAmount =
    form.sendAmount && form.exchangeRate
      ? (parseFloat(form.sendAmount) * parseFloat(form.exchangeRate)).toFixed(2)
      : '';

  const totalCollected =
    form.sendAmount && form.fee
      ? (parseFloat(form.sendAmount) + parseFloat(form.fee)).toFixed(2)
      : form.sendAmount;

  useEffect(() => {
    Promise.all([
      fetch('/api/customers').then((r) => r.json()),
      fetch('/api/companies').then((r) => r.json()),
    ]).then(([c, co]) => {
      setCustomers(c.customers ?? []);
      setCompanies(co.companies ?? []);
    });
  }, []);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, receiveAmount, totalCollected }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to create transaction');
        return;
      }
      router.push('/dashboard/transactions');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">New Money Transfer</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sender */}
        <Card>
          <CardHeader><CardTitle>Sender Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Select label="Select Customer *" id="customerId" required value={form.customerId} onChange={set('customerId')}>
              <option value="">-- Select a customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName} — {c.phone}
                </option>
              ))}
            </Select>
            <p className="text-xs text-blue-600 hover:underline cursor-pointer"
              onClick={() => router.push('/dashboard/customers/new')}>
              + Add new customer
            </p>
          </CardContent>
        </Card>

        {/* Recipient */}
        <Card>
          <CardHeader><CardTitle>Recipient Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Recipient Full Name *" id="recipientName" required value={form.recipientName} onChange={set('recipientName')} placeholder="First Last" />
            <Input label="Recipient Phone" id="recipientPhone" value={form.recipientPhone} onChange={set('recipientPhone')} placeholder="+52..." />
            <Input label="Recipient City" id="recipientCity" value={form.recipientCity} onChange={set('recipientCity')} />
            <Select label="Destination Country *" id="recipientCountry" required value={form.recipientCountry} onChange={set('recipientCountry')}>
              {COUNTRIES.map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </Select>
          </CardContent>
        </Card>

        {/* Transfer Details */}
        <Card>
          <CardHeader><CardTitle>Transfer Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Select label="Transfer Company *" id="companyId" required value={form.companyId} onChange={set('companyId')}>
              <option value="">-- Select company --</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Input label="Send Amount (USD) *" id="sendAmount" type="number" step="0.01" min="1" required value={form.sendAmount} onChange={set('sendAmount')} placeholder="0.00" />
              <Input label="Exchange Rate *" id="exchangeRate" type="number" step="0.0001" min="0.01" required value={form.exchangeRate} onChange={set('exchangeRate')} placeholder="17.50" />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Receive Amount</label>
                <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
                  {receiveAmount || '0.00'}
                </div>
              </div>
              <Input label="Fee (USD) *" id="fee" type="number" step="0.01" min="0" required value={form.fee} onChange={set('fee')} placeholder="5.00" />
            </div>
            <div className="rounded-md bg-blue-50 p-3 text-sm">
              <span className="font-medium text-blue-900">Total to Collect: </span>
              <span className="text-blue-800 font-bold">${totalCollected ?? '0.00'} USD</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select label="Payment Method" id="paymentMethod" value={form.paymentMethod} onChange={set('paymentMethod')}>
                <option value="CASH">Cash</option>
                <option value="DEBIT">Debit Card</option>
                <option value="CHECK">Check</option>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Reference / Confirmation #" id="referenceNumber" value={form.referenceNumber} onChange={set('referenceNumber')} placeholder="From company system" />
              <Input label="Control / Folio #" id="controlNumber" value={form.controlNumber} onChange={set('controlNumber')} placeholder="PIN for pickup" />
            </div>
          </CardContent>
        </Card>

        {/* Compliance */}
        <Card>
          <CardHeader><CardTitle>Compliance</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Purpose of Transfer" id="purposeOfTransfer" value={form.purposeOfTransfer} onChange={set('purposeOfTransfer')}>
              <option>Family Support</option>
              <option>Business Payment</option>
              <option>Gift</option>
              <option>Medical Expenses</option>
              <option>Education</option>
              <option>Other</option>
            </Select>
            <Select label="Source of Funds" id="sourceOfFunds" value={form.sourceOfFunds} onChange={set('sourceOfFunds')}>
              <option>Employment</option>
              <option>Business</option>
              <option>Savings</option>
              <option>Pension / Retirement</option>
              <option>Other</option>
            </Select>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={set('notes')}
                rows={2}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Processing...' : 'Create Transfer'}
          </Button>
        </div>
      </form>
    </div>
  );
}
