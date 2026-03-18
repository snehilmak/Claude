import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getActiveLocation, getOrgLocations, locationWhereClause } from '@/lib/location';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, statusBadgeVariant } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Plus } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{ status?: string; company?: string; from?: string; to?: string; loc?: string }>;
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/login');

  const params = await searchParams;
  const { status, company, from, to } = params;

  const active = await getActiveLocation(session);
  const locWhere = locationWhereClause(active);

  const whereClause: Record<string, unknown> = {
    organizationId: session.organization.id,
    ...locWhere,
  };
  if (status) whereClause.status = status;
  if (company) whereClause.companyId = company;
  if (from || to) {
    whereClause.createdAt = {};
    if (from) (whereClause.createdAt as Record<string, Date>).gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      (whereClause.createdAt as Record<string, Date>).lte = toDate;
    }
  }

  const [transactions, companies, locations] = await Promise.all([
    prisma.transaction.findMany({
      where: whereClause,
      include: {
        customer: true,
        company: true,
        agent: { select: { name: true } },
        location: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.transferCompany.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    active.mode === 'all' ? getOrgLocations(session.organization.id) : Promise.resolve([]),
  ]);

  const totalAmount = transactions.reduce((sum, tx) => sum + Number(tx.totalCollected), 0);
  const showLocationCol = active.mode === 'all';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500">
            {transactions.length} records — {formatCurrency(totalAmount)} total
            {active.mode === 'single' && ` · ${active.locationName}`}
          </p>
        </div>
        <Link href="/dashboard/transactions/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Transfer
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">From</label>
              <input type="date" name="from" defaultValue={from} className="rounded border border-gray-300 px-2 py-1 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">To</label>
              <input type="date" name="to" defaultValue={to} className="rounded border border-gray-300 px-2 py-1 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Company</label>
              <select name="company" defaultValue={company} className="rounded border border-gray-300 px-2 py-1 text-sm">
                <option value="">All Companies</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Status</label>
              <select name="status" defaultValue={status} className="rounded border border-gray-300 px-2 py-1 text-sm">
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="SENT">Sent</option>
                <option value="PAID">Paid</option>
                <option value="HELD">Held</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" variant="secondary" size="sm">Filter</Button>
              <Link href="/dashboard/transactions"><Button variant="outline" size="sm">Clear</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle>Transfer Records</CardTitle></CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="py-10 text-center text-gray-400">No transactions found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 font-medium">Ref #</th>
                    <th className="pb-3 font-medium">Sender</th>
                    <th className="pb-3 font-medium">Recipient</th>
                    <th className="pb-3 font-medium">Country</th>
                    <th className="pb-3 font-medium">Company</th>
                    <th className="pb-3 font-medium">Send</th>
                    <th className="pb-3 font-medium">Receive</th>
                    <th className="pb-3 font-medium">Fee</th>
                    <th className="pb-3 font-medium">Status</th>
                    {showLocationCol && <th className="pb-3 font-medium">Location</th>}
                    <th className="pb-3 font-medium">Agent</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="py-3 font-mono text-xs text-gray-500">
                        {tx.controlNumber ?? tx.referenceNumber ?? tx.id.slice(-8)}
                      </td>
                      <td className="py-3 font-medium text-gray-900">
                        {tx.customer.firstName} {tx.customer.lastName}
                      </td>
                      <td className="py-3 text-gray-600">{tx.recipientName}</td>
                      <td className="py-3 text-gray-500">{tx.recipientCountry}</td>
                      <td className="py-3 text-gray-600">{tx.company.name}</td>
                      <td className="py-3 font-medium">{formatCurrency(Number(tx.sendAmount))}</td>
                      <td className="py-3 text-gray-600">
                        {Number(tx.receiveAmount).toLocaleString()} {tx.receiveCurrency}
                      </td>
                      <td className="py-3 text-gray-500">{formatCurrency(Number(tx.fee))}</td>
                      <td className="py-3">
                        <Badge variant={statusBadgeVariant(tx.status)}>{tx.status}</Badge>
                      </td>
                      {showLocationCol && (
                        <td className="py-3 text-xs text-gray-500">{tx.location.name}</td>
                      )}
                      <td className="py-3 text-gray-500">{tx.agent.name}</td>
                      <td className="py-3 text-gray-500">
                        {new Date(tx.createdAt).toLocaleDateString()}
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
