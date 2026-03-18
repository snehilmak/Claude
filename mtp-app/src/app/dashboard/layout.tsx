import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  ArrowUpRight,
  List,
  Users,
  Building2,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react';
import { getSession } from '@/lib/auth';
import { getActiveLocation, getOrgLocations } from '@/lib/location';
import { LocationSwitcher } from '@/components/LocationSwitcher';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/transactions/new', label: 'New Transfer', icon: ArrowUpRight },
  { href: '/dashboard/transactions', label: 'Transactions', icon: List },
  { href: '/dashboard/customers', label: 'Customers', icon: Users },
  { href: '/dashboard/companies', label: 'Companies', icon: Building2 },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { user, organization } = session;

  const [activeLocation, locations] = await Promise.all([
    getActiveLocation(session),
    getOrgLocations(organization.id),
  ]);

  const locationLabel =
    activeLocation.mode === 'single' ? activeLocation.locationName : 'All Locations';

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
        {/* Brand */}
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <Link href="/dashboard" className="text-lg font-bold text-blue-600">
            TransferPro
          </Link>
        </div>

        {/* Location switcher */}
        <div className="border-b border-gray-100 px-4 py-3">
          <LocationSwitcher
            locations={locations}
            active={activeLocation}
            userRole={user.role}
          />
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <Icon className="h-4 w-4 text-gray-400" />
              {label}
            </Link>
          ))}
        </nav>

        {/* User info */}
        <div className="border-t border-gray-200 px-4 py-4 space-y-3">
          <div className="px-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider truncate">
              {organization.name}
            </p>
            <p className="mt-0.5 text-sm font-medium text-gray-700 truncate">{user.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                {user.role}
              </span>
              <span className="text-xs text-gray-400 truncate">{locationLabel}</span>
            </div>
          </div>
          <a
            href="/logout"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Top bar with active location context */}
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-2">
          <p className="text-xs text-gray-500">
            Viewing:{' '}
            <span className="font-semibold text-gray-700">{locationLabel}</span>
            {activeLocation.mode === 'all' && locations.length > 1 && (
              <span className="ml-1 text-gray-400">({locations.length} locations)</span>
            )}
          </p>
        </div>
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
