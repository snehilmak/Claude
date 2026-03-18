'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    firstName: '', lastName: '', middleName: '', dateOfBirth: '',
    phone: '', email: '', address: '', city: '', state: '', zip: '', country: 'US',
    idType: '', idNumber: '', idIssuedBy: '', idExpiresAt: '',
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to create customer');
        return;
      }
      router.push('/dashboard/customers');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">New Customer</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="First Name *" id="firstName" required value={form.firstName} onChange={set('firstName')} />
            <Input label="Last Name *" id="lastName" required value={form.lastName} onChange={set('lastName')} />
            <Input label="Middle Name" id="middleName" value={form.middleName} onChange={set('middleName')} />
            <Input label="Date of Birth" id="dateOfBirth" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
            <Input label="Phone *" id="phone" required type="tel" value={form.phone} onChange={set('phone')} placeholder="555-555-5555" />
            <Input label="Email" id="email" type="email" value={form.email} onChange={set('email')} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Address</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input label="Street Address" id="address" value={form.address} onChange={set('address')} />
            </div>
            <Input label="City" id="city" value={form.city} onChange={set('city')} />
            <Input label="State" id="state" value={form.state} onChange={set('state')} />
            <Input label="ZIP Code" id="zip" value={form.zip} onChange={set('zip')} />
            <Select label="Country" id="country" value={form.country} onChange={set('country')}>
              <option value="US">United States</option>
              <option value="MX">Mexico</option>
              <option value="GT">Guatemala</option>
              <option value="HN">Honduras</option>
              <option value="SV">El Salvador</option>
              <option value="NI">Nicaragua</option>
              <option value="OTHER">Other</option>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ID Verification</CardTitle>
            <p className="text-sm text-gray-500">Required for compliance</p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="ID Type" id="idType" value={form.idType} onChange={set('idType')}>
              <option value="">-- Select --</option>
              <option value="PASSPORT">Passport</option>
              <option value="DRIVERS_LICENSE">Driver&apos;s License</option>
              <option value="STATE_ID">State ID</option>
              <option value="MATRICULA">Matricula Consular</option>
              <option value="OTHER">Other</option>
            </Select>
            <Input label="ID Number" id="idNumber" value={form.idNumber} onChange={set('idNumber')} />
            <Input label="Issued By (State/Country)" id="idIssuedBy" value={form.idIssuedBy} onChange={set('idIssuedBy')} />
            <Input label="Expires On" id="idExpiresAt" type="date" value={form.idExpiresAt} onChange={set('idExpiresAt')} />
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Customer'}
          </Button>
        </div>
      </form>
    </div>
  );
}
