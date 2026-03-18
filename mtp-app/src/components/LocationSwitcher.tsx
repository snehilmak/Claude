'use client';

import { useRouter } from 'next/navigation';
import { MapPin } from 'lucide-react';
import type { ActiveLocation } from '@/lib/location';

interface LocationSwitcherProps {
  locations: { id: string; name: string }[];
  active: ActiveLocation;
  userRole: string;
}

export function LocationSwitcher({ locations, active, userRole }: LocationSwitcherProps) {
  const router = useRouter();

  // Agents see a static badge — no switching allowed
  if (userRole === 'AGENT') {
    return (
      <div className="flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2">
        <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0" />
        <span className="text-sm font-medium text-blue-800 truncate">
          {active.mode === 'single' ? active.locationName : 'No location assigned'}
        </span>
      </div>
    );
  }

  const currentValue = active.mode === 'single' ? active.locationId : 'all';

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    await fetch('/api/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId: value }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <p className="px-1 text-xs font-medium text-gray-400 uppercase tracking-wider">Location</p>
      <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5">
        <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <select
          value={currentValue}
          onChange={handleChange}
          className="flex-1 bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer min-w-0"
        >
          <option value="all">All Locations</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
