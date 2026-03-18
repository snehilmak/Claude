import { cookies } from 'next/headers';
import { prisma } from './db';
import type { SessionData } from './auth';
import type { Location } from '@prisma/client';

const LOCATION_COOKIE = 'mtp_location';

export type ActiveLocation =
  | { mode: 'all' }
  | { mode: 'single'; locationId: string; locationName: string };

/**
 * Resolves the active location for the current session.
 * - AGENT: always locked to their assigned location (cookie is ignored).
 * - OWNER/MANAGER: reads mtp_location cookie; defaults to 'all'.
 */
export async function getActiveLocation(session: SessionData): Promise<ActiveLocation> {
  // Agents are always locked to their assigned location
  if (session.user.role === 'AGENT') {
    if (!session.user.locationId) {
      // Agent not assigned to any location — return a sentinel
      return { mode: 'all' }; // will be caught by callers that check role
    }
    const loc = session.user.location;
    return {
      mode: 'single',
      locationId: session.user.locationId,
      locationName: loc?.name ?? 'Your Location',
    };
  }

  // Owner / Manager: read cookie
  const cookieStore = await cookies();
  const cookieVal = cookieStore.get(LOCATION_COOKIE)?.value;

  if (!cookieVal || cookieVal === 'all') {
    return { mode: 'all' };
  }

  // Validate the location belongs to this org
  const loc = await prisma.location.findFirst({
    where: { id: cookieVal, organizationId: session.organization.id },
  });

  if (!loc) return { mode: 'all' };

  return { mode: 'single', locationId: loc.id, locationName: loc.name };
}

/**
 * Returns all locations for an organization.
 */
export async function getOrgLocations(organizationId: string): Promise<Location[]> {
  return prisma.location.findMany({
    where: { organizationId },
    orderBy: { name: 'asc' },
  });
}

/**
 * Returns a Prisma `where` fragment for location filtering.
 */
export function locationWhereClause(active: ActiveLocation): { locationId?: string } {
  if (active.mode === 'single') return { locationId: active.locationId };
  return {};
}

/**
 * Sets the mtp_location cookie (server-side, called from API route).
 */
export async function setActiveLocationCookie(value: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(LOCATION_COOKIE, value, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}
