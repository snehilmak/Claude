'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Building2, Users, MapPin, Settings2, CreditCard,
  Plus, Trash2, Pencil, Check, X, AlertCircle, CheckCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrgProfile {
  id: string; name: string; email: string; phone: string | null;
  address: string | null; city: string | null; state: string | null;
  zip: string | null; country: string;
  subscriptionStatus: string; trialEndsAt: string | null; createdAt: string;
}

interface OrgUser {
  id: string; name: string; email: string; role: string; createdAt: string;
  location: { id: string; name: string } | null;
}

interface OrgLocation {
  id: string; name: string; address: string | null; city: string | null;
  state: string | null; zip: string | null; phone: string | null;
  licenseNumber: string | null;
  _count: { users: number; transactions: number };
}

interface CompanyWithConfig {
  id: string; name: string; code: string;
  config: { agentCode: string | null; accountNumber: string | null; isEnabled: boolean } | null;
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'org', label: 'Organization', icon: Building2 },
  { id: 'locations', label: 'Locations', icon: MapPin },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'companies', label: 'Companies', icon: Settings2 },
  { id: 'billing', label: 'Billing', icon: CreditCard },
] as const;

type TabId = (typeof TABS)[number]['id'];

// ─── Flash helper ─────────────────────────────────────────────────────────────

type FlashState = 'idle' | 'saving' | 'saved' | 'error';

function useFlash() {
  const [flash, setFlash] = useState<FlashState>('idle');
  const [msg, setMsg] = useState('');

  function ok(m = 'Saved!') {
    setMsg(m); setFlash('saved');
    setTimeout(() => setFlash('idle'), 3000);
  }
  function err(m = 'Error. Please try again.') {
    setMsg(m); setFlash('error');
    setTimeout(() => setFlash('idle'), 4000);
  }

  return { flash, msg, ok, err, saving: () => setFlash('saving') };
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

export default function SettingsPage() {
  const [tab, setTab] = useState<TabId>('org');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage your organization, team, and configuration</p>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === 'org' && <OrgTab />}
      {tab === 'locations' && <LocationsTab />}
      {tab === 'team' && <TeamTab />}
      {tab === 'companies' && <CompaniesTab />}
      {tab === 'billing' && <BillingTab />}
    </div>
  );
}

// ─── Org Profile Tab ──────────────────────────────────────────────────────────

function OrgTab() {
  const { flash, msg, ok, err, saving } = useFlash();
  const [org, setOrg] = useState<OrgProfile | null>(null);
  const [form, setForm] = useState({
    name: '', phone: '', address: '', city: '', state: '', zip: '', country: 'US',
  });

  useEffect(() => {
    fetch('/api/settings/org').then(r => r.json()).then(d => {
      if (d.org) {
        setOrg(d.org);
        setForm({
          name: d.org.name ?? '',
          phone: d.org.phone ?? '',
          address: d.org.address ?? '',
          city: d.org.city ?? '',
          state: d.org.state ?? '',
          zip: d.org.zip ?? '',
          country: d.org.country ?? 'US',
        });
      }
    });
  }, []);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    saving();
    const res = await fetch('/api/settings/org', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) ok('Organization profile saved!');
    else {
      const d = await res.json();
      err(d.error ?? 'Failed to save');
    }
  }

  if (!org) return <div className="text-sm text-gray-500">Loading…</div>;

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-6">
      <Card>
        <CardHeader><CardTitle>Organization Profile</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input label="Business Name *" id="name" required value={form.name} onChange={set('name')} />
          </div>
          <Input label="Phone" id="phone" type="tel" value={form.phone} onChange={set('phone')} />
          <div />
          <div className="sm:col-span-2">
            <Input label="Street Address" id="address" value={form.address} onChange={set('address')} />
          </div>
          <Input label="City" id="city" value={form.city} onChange={set('city')} />
          <Input label="State" id="state" value={form.state} onChange={set('state')} />
          <Input label="ZIP" id="zip" value={form.zip} onChange={set('zip')} />
          <Select label="Country" id="country" value={form.country} onChange={set('country')}>
            <option value="US">United States</option>
            <option value="MX">Mexico</option>
            <option value="OTHER">Other</option>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Account Info</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p><span className="font-medium">Email:</span> {org.email}</p>
          <p><span className="font-medium">Member since:</span> {new Date(org.createdAt).toLocaleDateString()}</p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={flash === 'saving'}>
          {flash === 'saving' ? 'Saving…' : 'Save Changes'}
        </Button>
        {flash === 'saved' && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" /> {msg}
          </span>
        )}
        {flash === 'error' && (
          <span className="flex items-center gap-1 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" /> {msg}
          </span>
        )}
      </div>
    </form>
  );
}

// ─── Locations Tab ────────────────────────────────────────────────────────────

const EMPTY_LOC = { name: '', address: '', city: '', state: '', zip: '', phone: '', licenseNumber: '' };

function LocationsTab() {
  const { flash, msg, ok, err } = useFlash();
  const [locations, setLocations] = useState<OrgLocation[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_LOC });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch('/api/settings/locations').then(r => r.json()).then(d => setLocations(d.locations ?? []));
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = editId ? `/api/settings/locations/${editId}` : '/api/settings/locations';
    const method = editId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      ok(editId ? 'Location updated!' : 'Location added!');
      setShowAdd(false); setEditId(null); setForm({ ...EMPTY_LOC }); load();
    } else {
      const d = await res.json();
      err(d.error ?? 'Failed to save location');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this location? This cannot be undone.')) return;
    const res = await fetch(`/api/settings/locations/${id}`, { method: 'DELETE' });
    if (res.ok) { ok('Location deleted'); load(); }
    else { const d = await res.json(); err(d.error ?? 'Failed to delete'); }
  }

  function startEdit(loc: OrgLocation) {
    setEditId(loc.id);
    setForm({
      name: loc.name, address: loc.address ?? '', city: loc.city ?? '',
      state: loc.state ?? '', zip: loc.zip ?? '', phone: loc.phone ?? '',
      licenseNumber: loc.licenseNumber ?? '',
    });
    setShowAdd(true);
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{locations.length} location(s)</p>
        <Button size="sm" onClick={() => { setShowAdd(true); setEditId(null); setForm({ ...EMPTY_LOC }); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Location
        </Button>
      </div>

      {(showAdd) && (
        <Card>
          <CardHeader>
            <CardTitle>{editId ? 'Edit Location' : 'New Location'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input label="Location Name *" id="loc-name" required value={form.name} onChange={set('name')} />
              </div>
              <div className="sm:col-span-2">
                <Input label="Street Address" id="loc-address" value={form.address} onChange={set('address')} />
              </div>
              <Input label="City" id="loc-city" value={form.city} onChange={set('city')} />
              <Input label="State" id="loc-state" value={form.state} onChange={set('state')} />
              <Input label="ZIP" id="loc-zip" value={form.zip} onChange={set('zip')} />
              <Input label="Phone" id="loc-phone" type="tel" value={form.phone} onChange={set('phone')} />
              <div className="sm:col-span-2">
                <Input label="MSB License Number" id="loc-license" value={form.licenseNumber} onChange={set('licenseNumber')} />
              </div>
              <div className="sm:col-span-2 flex gap-3">
                <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => { setShowAdd(false); setEditId(null); }}>Cancel</Button>
                {flash === 'error' && <span className="text-sm text-red-600">{msg}</span>}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {flash === 'saved' && (
        <div className="flex items-center gap-2 rounded-md bg-green-50 px-4 py-2 text-sm text-green-700">
          <CheckCircle className="h-4 w-4" /> {msg}
        </div>
      )}

      <div className="space-y-3">
        {locations.map((loc) => (
          <Card key={loc.id}>
            <CardContent className="flex items-start justify-between pt-5">
              <div>
                <p className="font-semibold text-gray-900">{loc.name}</p>
                {(loc.city || loc.state) && (
                  <p className="text-sm text-gray-500">{[loc.address, loc.city, loc.state, loc.zip].filter(Boolean).join(', ')}</p>
                )}
                {loc.phone && <p className="text-sm text-gray-500">{loc.phone}</p>}
                {loc.licenseNumber && (
                  <p className="text-xs text-gray-400 font-mono mt-0.5">License: {loc.licenseNumber}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {loc._count.users} user(s) · {loc._count.transactions} transactions
                </p>
              </div>
              <div className="flex gap-2 ml-4 shrink-0">
                <button
                  onClick={() => startEdit(loc)}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(loc.id)}
                  className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Team Tab ─────────────────────────────────────────────────────────────────

const EMPTY_USER = { name: '', email: '', password: '', role: 'AGENT', locationId: '' };

function TeamTab() {
  const { flash, msg, ok, err } = useFlash();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_USER });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ role: string; locationId: string } | null>(null);

  const load = useCallback(() => {
    fetch('/api/settings/users').then(r => r.json()).then(d => setUsers(d.users ?? []));
    fetch('/api/settings/locations').then(r => r.json()).then(d => setLocations(d.locations ?? []));
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/settings/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, locationId: form.locationId || undefined }),
    });
    setSaving(false);
    if (res.ok) {
      ok('User added!'); setShowAdd(false); setForm({ ...EMPTY_USER }); load();
    } else {
      const d = await res.json(); err(d.error ?? 'Failed to add user');
    }
  }

  async function handleUpdate(id: string) {
    if (!editForm) return;
    setSaving(true);
    const res = await fetch(`/api/settings/users/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: editForm.role, locationId: editForm.locationId || null }),
    });
    setSaving(false);
    if (res.ok) { ok('User updated!'); setEditId(null); setEditForm(null); load(); }
    else { const d = await res.json(); err(d.error ?? 'Failed to update'); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this user? They will lose access immediately.')) return;
    const res = await fetch(`/api/settings/users/${id}`, { method: 'DELETE' });
    if (res.ok) { ok('User removed'); load(); }
    else { const d = await res.json(); err(d.error ?? 'Failed to remove'); }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{users.length} team member(s)</p>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      {flash === 'saved' && (
        <div className="flex items-center gap-2 rounded-md bg-green-50 px-4 py-2 text-sm text-green-700">
          <CheckCircle className="h-4 w-4" /> {msg}
        </div>
      )}
      {flash === 'error' && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" /> {msg}
        </div>
      )}

      {showAdd && (
        <Card>
          <CardHeader><CardTitle>Add Team Member</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleAddUser} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="Full Name *" id="u-name" required value={form.name} onChange={set('name')} />
              <Input label="Email *" id="u-email" type="email" required value={form.email} onChange={set('email')} />
              <Input label="Password *" id="u-pw" type="password" required value={form.password} onChange={set('password')} placeholder="Min 8 chars" />
              <Select label="Role" id="u-role" value={form.role} onChange={set('role')}>
                <option value="AGENT">Agent</option>
                <option value="MANAGER">Manager</option>
                <option value="OWNER">Owner</option>
              </Select>
              <Select label="Assigned Location" id="u-loc" value={form.locationId} onChange={set('locationId')}>
                <option value="">— None / All —</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
              <div />
              <div className="sm:col-span-2 flex gap-3">
                <Button type="submit" size="sm" disabled={saving}>{saving ? 'Adding…' : 'Add User'}</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Email</th>
                <th className="pb-2 font-medium">Role</th>
                <th className="pb-2 font-medium">Location</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="py-3 font-medium text-gray-900">{u.name}</td>
                  <td className="py-3 text-gray-500">{u.email}</td>
                  <td className="py-3">
                    {editId === u.id && editForm ? (
                      <Select
                        label=""
                        id="edit-role"
                        value={editForm.role}
                        onChange={e => setEditForm(p => p ? { ...p, role: e.target.value } : p)}
                        className="text-xs py-1"
                      >
                        <option value="AGENT">Agent</option>
                        <option value="MANAGER">Manager</option>
                        <option value="OWNER">Owner</option>
                      </Select>
                    ) : (
                      <Badge variant={u.role === 'OWNER' ? 'destructive' : u.role === 'MANAGER' ? 'warning' : 'default'}>
                        {u.role}
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 text-gray-500">
                    {editId === u.id && editForm ? (
                      <Select
                        label=""
                        id="edit-loc"
                        value={editForm.locationId}
                        onChange={e => setEditForm(p => p ? { ...p, locationId: e.target.value } : p)}
                        className="text-xs py-1"
                      >
                        <option value="">— None —</option>
                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </Select>
                    ) : (
                      u.location?.name ?? <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex gap-1 justify-end">
                      {editId === u.id ? (
                        <>
                          <button onClick={() => handleUpdate(u.id)} disabled={saving}
                            className="p-1.5 rounded hover:bg-green-50 text-green-600">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={() => { setEditId(null); setEditForm(null); }}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditId(u.id); setEditForm({ role: u.role, locationId: u.location?.id ?? '' }); }}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(u.id)}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Companies Tab ────────────────────────────────────────────────────────────

function CompaniesTab() {
  const { flash, msg, ok, err } = useFlash();
  const [companies, setCompanies] = useState<CompanyWithConfig[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ agentCode: '', accountNumber: '', isEnabled: true });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch('/api/settings/companies').then(r => r.json()).then(d => setCompanies(d.companies ?? []));
  }, []);

  useEffect(() => { load(); }, [load]);

  function startEdit(co: CompanyWithConfig) {
    setEditId(co.id);
    setEditForm({
      agentCode: co.config?.agentCode ?? '',
      accountNumber: co.config?.accountNumber ?? '',
      isEnabled: co.config?.isEnabled ?? true,
    });
  }

  async function handleSave(companyId: string) {
    setSaving(true);
    const res = await fetch('/api/settings/companies', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, ...editForm }),
    });
    setSaving(false);
    if (res.ok) { ok('Company config saved!'); setEditId(null); load(); }
    else { const d = await res.json(); err(d.error ?? 'Failed to save'); }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm text-gray-500">
        Configure your agent codes and account numbers for each transfer company.
      </p>

      {flash === 'saved' && (
        <div className="flex items-center gap-2 rounded-md bg-green-50 px-4 py-2 text-sm text-green-700">
          <CheckCircle className="h-4 w-4" /> {msg}
        </div>
      )}
      {flash === 'error' && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" /> {msg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {companies.map((co) => (
          <Card key={co.id} className={co.config?.isEnabled ? '' : 'opacity-60'}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">{co.name}</p>
                  <p className="text-xs font-mono text-gray-400">{co.code}</p>
                </div>
                <Badge variant={co.config?.isEnabled ? 'success' : 'default'}>
                  {co.config?.isEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>

              {editId === co.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Agent Code"
                    value={editForm.agentCode}
                    onChange={e => setEditForm(p => ({ ...p, agentCode: e.target.value }))}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Account Number"
                    value={editForm.accountNumber}
                    onChange={e => setEditForm(p => ({ ...p, accountNumber: e.target.value }))}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.isEnabled}
                      onChange={e => setEditForm(p => ({ ...p, isEnabled: e.target.checked }))}
                    />
                    Enabled
                  </label>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleSave(co.id)}
                      disabled={saving}
                      className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" /> Save
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="flex items-center gap-1 rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      <X className="h-3.5 w-3.5" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {co.config?.agentCode && (
                    <p className="text-xs text-gray-500">
                      Agent: <span className="font-mono">{co.config.agentCode}</span>
                    </p>
                  )}
                  {co.config?.accountNumber && (
                    <p className="text-xs text-gray-500">
                      Acct: <span className="font-mono">{co.config.accountNumber}</span>
                    </p>
                  )}
                  {!co.config && (
                    <p className="text-xs text-gray-400 italic">Not configured</p>
                  )}
                  <button
                    onClick={() => startEdit(co)}
                    className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                  >
                    <Pencil className="h-3 w-3" /> Configure
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Billing Tab ──────────────────────────────────────────────────────────────

function BillingTab() {
  const [org, setOrg] = useState<OrgProfile | null>(null);

  useEffect(() => {
    fetch('/api/settings/org').then(r => r.json()).then(d => setOrg(d.org));
  }, []);

  if (!org) return <div className="text-sm text-gray-500">Loading…</div>;

  const statusColors: Record<string, string> = {
    TRIAL: 'bg-yellow-100 text-yellow-800',
    ACTIVE: 'bg-green-100 text-green-800',
    PAST_DUE: 'bg-red-100 text-red-800',
    CANCELED: 'bg-gray-100 text-gray-600',
    PAUSED: 'bg-orange-100 text-orange-800',
  };

  const trialDaysLeft = org.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(org.trialEndsAt).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader><CardTitle>Subscription</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusColors[org.subscriptionStatus] ?? 'bg-gray-100'}`}>
              {org.subscriptionStatus}
            </span>
            {trialDaysLeft !== null && org.subscriptionStatus === 'TRIAL' && (
              <span className="text-sm text-gray-500">
                {trialDaysLeft > 0 ? `${trialDaysLeft} day(s) remaining in trial` : 'Trial expired'}
              </span>
            )}
          </div>

          {org.subscriptionStatus === 'TRIAL' && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900 mb-1">Upgrade to a paid plan</p>
              <p className="text-sm text-blue-700 mb-3">
                $49/location/month · Unlimited transactions · All compliance features included
              </p>
              <Button size="sm" onClick={() => alert('Stripe billing portal coming soon.')}>
                Upgrade Now
              </Button>
            </div>
          )}

          {org.subscriptionStatus === 'ACTIVE' && (
            <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              Your subscription is active. To manage billing, update payment method, or cancel,
              contact support.
            </div>
          )}

          {org.subscriptionStatus === 'PAST_DUE' && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <strong>Payment past due.</strong> Please update your payment method to avoid service interruption.
              <div className="mt-2">
                <Button size="sm" variant="destructive" onClick={() => alert('Stripe billing portal coming soon.')}>
                  Update Payment Method
                </Button>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-400 pt-2">
            Account created: {new Date(org.createdAt).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Plan Details</CardTitle></CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-1">
          <p>• <strong>$49/location/month</strong> — flat fee, no per-transaction charges</p>
          <p>• Unlimited transactions, customers, and agents</p>
          <p>• Includes CTR alerts, audit trail, and compliance reports</p>
          <p>• Multi-location support with role-based access</p>
        </CardContent>
      </Card>
    </div>
  );
}
