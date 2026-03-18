/**
 * Unit tests for /api/settings/org (GET + PUT)
 */
import { NextRequest } from 'next/server';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockOwnerSession = {
  user: { id: 'u1', name: 'Alice', role: 'OWNER', locationId: null, location: null },
  organization: { id: 'org_1', name: 'Test Org' },
};

const mockAgentSession = {
  user: { id: 'u2', name: 'Bob', role: 'AGENT', locationId: 'loc_1', location: null },
  organization: { id: 'org_1', name: 'Test Org' },
};

jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }));

const mockPrisma = {
  organization: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};
jest.mock('@/lib/db', () => ({ prisma: mockPrisma }));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('/api/settings/org', () => {
  let GET: () => Promise<Response>;
  let PUT: (req: NextRequest) => Promise<Response>;
  const { getSession } = require('@/lib/auth') as { getSession: jest.Mock };

  beforeAll(async () => {
    const mod = await import('@/app/api/settings/org/route');
    GET = mod.GET;
    PUT = mod.PUT;
  });

  beforeEach(() => jest.clearAllMocks());

  // ── GET ──

  it('GET returns 401 when unauthenticated', async () => {
    getSession.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('GET returns org profile', async () => {
    getSession.mockResolvedValueOnce(mockOwnerSession);
    const fakeOrg = { id: 'org_1', name: 'Test Org', email: 'test@org.com', phone: null,
      subscriptionStatus: 'TRIAL', trialEndsAt: null, createdAt: new Date().toISOString() };
    mockPrisma.organization.findUnique.mockResolvedValueOnce(fakeOrg);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.org.name).toBe('Test Org');
  });

  // ── PUT ──

  it('PUT returns 401 when unauthenticated', async () => {
    getSession.mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost/api/settings/org', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name' }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(401);
  });

  it('PUT returns 403 for AGENT role', async () => {
    getSession.mockResolvedValueOnce(mockAgentSession);
    const req = new NextRequest('http://localhost/api/settings/org', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name' }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(403);
  });

  it('PUT returns 400 when name is empty', async () => {
    getSession.mockResolvedValueOnce(mockOwnerSession);
    const req = new NextRequest('http://localhost/api/settings/org', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it('PUT updates org with valid data', async () => {
    getSession.mockResolvedValueOnce(mockOwnerSession);
    const updated = { id: 'org_1', name: 'Updated Org', phone: '555-1234' };
    mockPrisma.organization.update.mockResolvedValueOnce(updated);

    const req = new NextRequest('http://localhost/api/settings/org', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Org', phone: '555-1234' }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.org.name).toBe('Updated Org');
  });

  it('PUT trims whitespace from name', async () => {
    getSession.mockResolvedValueOnce(mockOwnerSession);
    mockPrisma.organization.update.mockResolvedValueOnce({ id: 'org_1', name: 'My Org' });

    const req = new NextRequest('http://localhost/api/settings/org', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '  My Org  ' }),
    });
    await PUT(req);
    expect(mockPrisma.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'My Org' }),
      })
    );
  });

  it('PUT sets empty phone to null', async () => {
    getSession.mockResolvedValueOnce(mockOwnerSession);
    mockPrisma.organization.update.mockResolvedValueOnce({ id: 'org_1', name: 'Org', phone: null });

    const req = new NextRequest('http://localhost/api/settings/org', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Org', phone: '' }),
    });
    await PUT(req);
    expect(mockPrisma.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phone: null }),
      })
    );
  });
});
