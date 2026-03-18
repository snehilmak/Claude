import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const { user, organization } = session;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <Link href="/dashboard" className="text-lg font-bold text-blue-600">
            TransferPro
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            <span>Dashboard</span>
          </Link>
          <Link
            href="/dashboard/transactions/new"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100"
          >
            <span>+ New Transfer</span>
          </Link>
          <Link
            href="/dashboard/transactions"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            <span>Transactions</span>
          </Link>
          <Link
            href="/dashboard/customers"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            <span>Customers</span>
          </Link>
          <Link
            href="/dashboard/companies"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            <span>Companies</span>
          </Link>
          <Link
            href="/dashboard/reports"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            <span>Reports</span>
          </Link>
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            <span>Settings</span>
          </Link>
        </nav>

        <div className="border-t border-gray-200 px-4 py-4">
          <div className="mb-3 px-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {organization.name}
            </p>
            <p className="mt-1 text-sm text-gray-700">{user.name}</p>
            <p className="text-xs text-gray-500">{user.role}</p>
          </div>
          <a
            href="/logout"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Sign out
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
