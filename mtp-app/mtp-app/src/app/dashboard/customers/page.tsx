import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, AlertCircle } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function CustomersPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/login');

  const params = await searchParams;
  const q = params.q?.trim();

  const customers = await prisma.customer.findMany({
    where: {
      organizationId: session.organization.id,
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q } },
              { idNumber: { contains: q } },
            ],
          }
        : {}),
    },
    include: { _count: { select: { transactions: true } } },
    orderBy: { lastName: 'asc' },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">{customers.length} registered senders</p>
        </div>
        <Link href="/dashboard/customers/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Customer
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="flex gap-3">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search by name, phone, or ID number..."
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Button type="submit" variant="secondary" size="sm">Search</Button>
            {q && (
              <Link href="/dashboard/customers">
                <Button variant="outline" size="sm">Clear</Button>
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Customer List</CardTitle></CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-gray-400">
              <AlertCircle className="h-10 w-10 mb-2" />
              <p>{q ? 'No customers matched your search.' : 'No customers yet.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Phone</th>
                    <th className="pb-3 font-medium">ID</th>
                    <th className="pb-3 font-medium">City</th>
                    <th className="pb-3 font-medium">Transfers</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-900">
                        {c.firstName} {c.middleName ? c.middleName + ' ' : ''}{c.lastName}
                      </td>
                      <td className="py-3 text-gray-600">{c.phone}</td>
                      <td className="py-3 text-gray-500 font-mono text-xs">
                        {c.idType ? `${c.idType}: ${c.idNumber}` : '—'}
                      </td>
                      <td className="py-3 text-gray-500">{c.city ?? '—'}</td>
                      <td className="py-3 text-gray-600">{c._count.transactions}</td>
                      <td className="py-3">
                        {c.isBlocked ? (
                          <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                            Blocked
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            Active
                          </span>
                        )}
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
