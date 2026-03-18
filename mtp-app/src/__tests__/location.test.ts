/**
 * Unit tests for src/lib/location.ts — pure/non-async functions
 */

// Mock Prisma so @/lib/db doesn't initialize a real PrismaClient
jest.mock('@/lib/db', () => ({
  prisma: {
    location: { findFirst: jest.fn(), findMany: jest.fn() },
    session: { findUnique: jest.fn() },
  },
}));

// Mock next/headers (imported transitively by @/lib/location)
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({ get: jest.fn(), set: jest.fn() }),
}));

import { locationWhereClause } from '@/lib/location';
import type { ActiveLocation } from '@/lib/location';

describe('locationWhereClause', () => {
  it('returns empty object when mode is "all"', () => {
    const active: ActiveLocation = { mode: 'all' };
    expect(locationWhereClause(active)).toEqual({});
  });

  it('returns locationId filter when mode is "single"', () => {
    const active: ActiveLocation = {
      mode: 'single',
      locationId: 'loc_123',
      locationName: 'Main Branch',
    };
    expect(locationWhereClause(active)).toEqual({ locationId: 'loc_123' });
  });

  it('returns empty object for all-mode regardless of extra data', () => {
    const active = { mode: 'all' } as ActiveLocation;
    const result = locationWhereClause(active);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('single mode always includes the correct locationId', () => {
    const ids = ['abc', 'def', 'xyz123'];
    ids.forEach((id) => {
      const active: ActiveLocation = { mode: 'single', locationId: id, locationName: 'Loc' };
      expect(locationWhereClause(active)).toEqual({ locationId: id });
    });
  });
});
