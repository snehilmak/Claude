import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { ArrowUpRight, Users, DollarSign, Building2, AlertCircle } from 'lucide-react';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [todayTxCount, todayTxSum, totalCustomers, topCompany, recentTx, pendingTx] =
    await Promise.all([
      prisma.transaction.count({
        where: {
          organizationId: session.organization.id,
          createdAt: { gte: today, lt: tomorrow },
          status: { not: 'CANCELLED' },
        },
      }),
      prisma.transaction.aggregate({
        where: {
          organizationId: session.organization.id,
          createdAt: { gte: today, lt: tomorrow },
          status: { not: 'CANCELLED' },
        },
        _sum: { totalCollected: true },
      }),
      prisma.customer.count({ where: { organizationId: session.organization.id } }),
      prisma.transaction.groupBy({
        by: ['companyId'],
        where: { organizationId: session.organization.id, createdAt: { gte: today, lt: tomorrow } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 1,
      }),
      prisma.transaction.findMany({
        where: { organizationId: session.organization.id },
        include: { customer: true, company: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.transaction.count({
        where: { organizationId: session.organization.id, status: 'PENDING' },
      }),
    ]);

  const topCompanyName =
    topCompany.length > 0
      ? (
          await prisma.transferCompany.findUnique({
            where: { id: topCompany[0].companyId },
            select: { name: true },
          })
        )?.name ?? '—'
      : '—';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">
          Welcome back, {session.user.name}. Here&apos;s today&apos;s summary.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Today&apos;s Transfers</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{todayTxCount}</p>
            <p className="text-xs text-gray-500 mt-1">{pendingTx} pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Amount Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(Number(todayTxSum._sum.totalCollected ?? 0))}
            </p>
            <p className="text-xs text-gray-500 mt-1">USD today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{totalCustomers}</p>
            <p className="text-xs text-gray-500 mt-1">registered senders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Top Company Today</CardTitle>
            <Building2 className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{topCompanyName}</p>
            <p className="text-xs text-gray-500 mt-1">most used today</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTx.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-gray-400">
              <AlertCircle className="h-10 w-10 mb-2" />
              <p>No transactions yet. Start by creating a new transfer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 font-medium">Customer</th>
                    <th className="pb-3 font-medium">Recipient</th>
                    <th className="pb-3 font-medium">Company</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentTx.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-900">
                        {tx.customer.firstName} {tx.customer.lastName}
                      </td>
                      <td className="py-3 text-gray-600">{tx.recipientName}</td>
                      <td className="py-3 text-gray-600">{tx.company.name}</td>
                      <td className="py-3 text-gray-900 font-medium">
                        {formatCurrency(Number(tx.sendAmount))}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            tx.status === 'PAID' || tx.status === 'SENT'
                              ? 'bg-green-100 text-green-800'
                              : tx.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-800'
                              : tx.status === 'CANCELLED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
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
