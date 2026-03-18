/**
 * Unit tests for /api/settings/locations (GET + POST) and /api/settings/locations/[id] (PUT + DELETE)
 */
import { NextRequest } from 'next/server';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const ownerSession = {
  user: { id: 'u_owner', role: 'OWNER', locationId: null, location: null },
  organization: { id: 'org_1' },
};
const managerSession = {
  user: { id: 'u_mgr', role: 'MANAGER', locationId: null, location: null },
  organization: { id: 'org_1' },
};
const agentSession = {
  user: { id: 'u_agent', role: 'AGENT', locationId: 'loc_1', location: null },
  organization: { id: 'org_1' },
};

jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }));

const mockPrisma = {
  location: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
  },
};
jest.mock('@/lib/db', () => ({ prisma: mockPrisma }));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('/api/settings/locations GET', () => {
  let GET: () => Promise<Response>;
  const { getSession } = require('@/lib/auth') as { getSession: jest.Mock };

  beforeAll(async () => {
    const mod = await import('@/app/api/settings/locations/route');
    GET = mod.GET;
  });

  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    getSession.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns location list for OWNER', async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    mockPrisma.location.findMany.mockResolvedValueOnce([
      { id: 'loc_1', name: 'Main Branch', _count: { users: 2, transactions: 50 } },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.locations).toHaveLength(1);
  });
});

describe('/api/settings/locations POST', () => {
  let POST: (req: NextRequest) => Promise<Response>;
  const { getSession } = require('@/lib/auth') as { getSession: jest.Mock };

  beforeAll(async () => {
    const mod = await import('@/app/api/settings/locations/route');
    POST = mod.POST;
  });

  beforeEach(() => jest.clearAllMocks());

  function makeReq(body: unknown) {
    return new NextRequest('http://localhost/api/settings/locations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
  }

  it('returns 401 when unauthenticated', async () => {
    getSession.mockResolvedValueOnce(null);
    const res = await POST(makeReq({ name: 'Branch 2' }));
    expect(res.status).toBe(401);
  });

  it('returns 403 for MANAGER (only OWNER can add)', async () => {
    getSession.mockResolvedValueOnce(managerSession);
    const res = await POST(makeReq({ name: 'Branch 2' }));
    expect(res.status).toBe(403);
  });

  it('returns 403 for AGENT', async () => {
    getSession.mockResolvedValueOnce(agentSession);
    const res = await POST(makeReq({ name: 'Branch 2' }));
    expect(res.status).toBe(403);
  });

  it('returns 400 when name is missing', async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    const res = await POST(makeReq({ address: '123 Main St' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/name/i);
  });

  it('creates location with valid data', async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    mockPrisma.location.create.mockResolvedValueOnce({
      id: 'loc_new', name: 'Branch 2', organizationId: 'org_1',
    });
    const res = await POST(makeReq({ name: 'Branch 2', city: 'Houston', state: 'TX' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.location.name).toBe('Branch 2');
  });

  it('links location to organization', async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    mockPrisma.location.create.mockResolvedValueOnce({ id: 'loc_2', name: 'B', organizationId: 'org_1' });
    await POST(makeReq({ name: 'B' }));
    expect(mockPrisma.location.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 'org_1' }),
      })
    );
  });
});

describe('/api/settings/locations/[id] DELETE', () => {
  let DELETE: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
  const { getSession } = require('@/lib/auth') as { getSession: jest.Mock };

  beforeAll(async () => {
    const mod = await import('@/app/api/settings/locations/[id]/route');
    DELETE = mod.DELETE;
  });

  beforeEach(() => jest.clearAllMocks());

  const makeCtx = (id: string) => ({ params: Promise.resolve({ id }) });
  const makeReq = (id: string) => new NextRequest(`http://localhost/api/settings/locations/${id}`, { method: 'DELETE' });

  it('returns 401 when unauthenticated', async () => {
    getSession.mockResolvedValueOnce(null);
    const res = await DELETE(makeReq('loc_1'), makeCtx('loc_1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 for MANAGER', async () => {
    getSession.mockResolvedValueOnce(managerSession);
    const res = await DELETE(makeReq('loc_1'), makeCtx('loc_1'));
    expect(res.status).toBe(403);
  });

  it('returns 404 when location not found', async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    mockPrisma.location.findFirst.mockResolvedValueOnce(null);
    const res = await DELETE(makeReq('loc_ghost'), makeCtx('loc_ghost'));
    expect(res.status).toBe(404);
  });

  it('returns 400 when trying to delete the only location', async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    mockPrisma.location.findFirst.mockResolvedValueOnce({ id: 'loc_1', name: 'Main' });
    mockPrisma.location.count.mockResolvedValueOnce(1); // only one location
    const res = await DELETE(makeReq('loc_1'), makeCtx('loc_1'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/only location/i);
  });

  it('deletes location when multiple exist', async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    mockPrisma.location.findFirst.mockResolvedValueOnce({ id: 'loc_2', name: 'Branch 2' });
    mockPrisma.location.count.mockResolvedValueOnce(2); // 2 locations exist
    mockPrisma.location.delete.mockResolvedValueOnce({});
    const res = await DELETE(makeReq('loc_2'), makeCtx('loc_2'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
