import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getActiveLocation, locationWhereClause } from '@/lib/location';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/login');

  const params = await searchParams;

  const active = await getActiveLocation(session);
  const locWhere = locationWhereClause(active);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fromDate = params.from ? new Date(params.from) : today;
  fromDate.setHours(0, 0, 0, 0);
  const toDate = params.to ? new Date(params.to) : new Date(fromDate);
  toDate.setHours(23, 59, 59, 999);

  const baseWhere = {
    organizationId: session.organization.id,
    ...locWhere,
    createdAt: { gte: fromDate, lte: toDate },
    status: { not: 'CANCELLED' as const },
  };

  const [transactions, byCompany, ctrCustomers] = await Promise.all([
    prisma.transaction.findMany({
      where: baseWhere,
      include: { customer: true, company: true, agent: { select: { name: true } }, location: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.transaction.groupBy({
      by: ['companyId'],
      where: baseWhere,
      _count: { id: true },
      _sum: { totalCollected: true, fee: true },
    }),
    prisma.transaction.groupBy({
      by: ['customerId'],
      where: baseWhere,
      _sum: { sendAmount: true },
      having: { sendAmount: { _sum: { gte: 1000 } } },
    }),
  ]);

  const companyNames = await prisma.transferCompany.findMany({ select: { id: true, name: true } });
  const companyMap = new Map(companyNames.map((c) => [c.id, c.name]));

  const ctrCustomerIds = ctrCustomers.map((c) => c.customerId);
  const ctrCustomerData = ctrCustomerIds.length
    ? await prisma.customer.findMany({
        where: { id: { in: ctrCustomerIds } },
        select: { id: true, firstName: true, lastName: true, phone: true, idNumber: true },
      })
    : [];
  const ctrCustomerMap = new Map(ctrCustomerData.map((c) => [c.id, c]));

  const totalAmount = transactions.reduce((s, t) => s + Number(t.totalCollected), 0);
  const totalFees = transactions.reduce((s, t) => s + Number(t.fee), 0);
  const contextLabel = active.mode === 'single' ? active.locationName : 'All Locations';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500">{contextLabel}</p>
      </div>

      {/* Date Picker */}
      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">From Date</label>
              <input type="date" name="from" defaultValue={fromDate.toISOString().slice(0, 10)} className="rounded border border-gray-300 px-2 py-1.5 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">To Date</label>
              <input type="date" name="to" defaultValue={toDate.toISOString().slice(0, 10)} className="rounded border border-gray-300 px-2 py-1.5 text-sm" />
            </div>
            <button type="submit" className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
              Generate Report
            </button>
          </form>
          <p className="mt-2 text-xs text-gray-400">
            Report for: <strong>{contextLabel}</strong> · {fromDate.toLocaleDateString()} – {toDate.toLocaleDateString()}
          </p>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Transactions', value: transactions.length },
          { label: 'Total Collected', value: formatCurrency(totalAmount) },
          { label: 'Total Fees', value: formatCurrency(totalFees) },
          { label: 'CTR Alerts', value: ctrCustomers.length, danger: ctrCustomers.length > 0 },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <p className="text-xs text-gray-500">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.danger ? 'text-red-600' : 'text-gray-900'}`}>
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CTR Alerts */}
      {ctrCustomers.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <CardTitle className="text-red-700">CTR Alerts — $1,000+ Threshold</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-red-600">
              These customers sent $1,000+ in this period. Review for CTR filing.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium">Phone</th>
                  <th className="pb-2 font-medium">ID Number</th>
                  <th className="pb-2 font-medium">Total Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ctrCustomers.map((row) => {
                  const cust = ctrCustomerMap.get(row.customerId);
                  return (
                    <tr key={row.customerId} className="bg-red-50">
                      <td className="py-2 font-medium text-red-900">
                        {cust ? `${cust.firstName} ${cust.lastName}` : row.customerId}
                      </td>
                      <td className="py-2 text-gray-600">{cust?.phone ?? '—'}</td>
                      <td className="py-2 font-mono text-xs text-gray-500">{cust?.idNumber ?? '—'}</td>
                      <td className="py-2 font-bold text-red-800">
                        {formatCurrency(Number(row._sum.sendAmount))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* By Company */}
      <Card>
        <CardHeader><CardTitle>Volume by Company</CardTitle></CardHeader>
        <CardContent>
          {byCompany.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No data for selected period.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Company</th>
                  <th className="pb-2 font-medium">Transactions</th>
                  <th className="pb-2 font-medium">Amount Collected</th>
                  <th className="pb-2 font-medium">Fees</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {byCompany.map((row) => (
                  <tr key={row.companyId}>
                    <td className="py-2 font-medium">{companyMap.get(row.companyId) ?? '—'}</td>
                    <td className="py-2">{row._count.id}</td>
                    <td className="py-2">{formatCurrency(Number(row._sum.totalCollected))}</td>
                    <td className="py-2">{formatCurrency(Number(row._sum.fee))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Transaction Detail */}
      <Card>
        <CardHeader><CardTitle>Transaction Detail</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Time</th>
                  <th className="pb-2 font-medium">Sender</th>
                  <th className="pb-2 font-medium">Recipient</th>
                  <th className="pb-2 font-medium">Company</th>
                  <th className="pb-2 font-medium">Send</th>
                  <th className="pb-2 font-medium">Receive</th>
                  <th className="pb-2 font-medium">Fee</th>
                  {active.mode === 'all' && <th className="pb-2 font-medium">Location</th>}
                  <th className="pb-2 font-medium">Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="py-1.5 text-gray-500">
                      {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-1.5">{tx.customer.firstName} {tx.customer.lastName}</td>
                    <td className="py-1.5 text-gray-600">{tx.recipientName}</td>
                    <td className="py-1.5 text-gray-600">{tx.company.name}</td>
                    <td className="py-1.5 font-medium">{formatCurrency(Number(tx.sendAmount))}</td>
                    <td className="py-1.5 text-gray-600">
                      {Number(tx.receiveAmount).toLocaleString()} {tx.receiveCurrency}
                    </td>
                    <td className="py-1.5">{formatCurrency(Number(tx.fee))}</td>
                    {active.mode === 'all' && (
                      <td className="py-1.5 text-xs text-gray-500">{tx.location.name}</td>
                    )}
                    <td className="py-1.5 text-gray-500">{tx.agent.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
