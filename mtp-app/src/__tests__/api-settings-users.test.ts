/**
 * Unit tests for /api/settings/users (GET + POST) and /api/settings/users/[id] (PUT + DELETE)
 */
import { NextRequest } from 'next/server';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const ownerSession = {
  user: { id: 'u_owner', name: 'Alice', role: 'OWNER', locationId: null, location: null },
  organization: { id: 'org_1', name: 'Test Org' },
};
const managerSession = {
  user: { id: 'u_mgr', name: 'Bob', role: 'MANAGER', locationId: null, location: null },
  organization: { id: 'org_1', name: 'Test Org' },
};
const agentSession = {
  user: { id: 'u_agent', name: 'Carol', role: 'AGENT', locationId: 'loc_1', location: null },
  organization: { id: 'org_1', name: 'Test Org' },
};

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  hashPassword: jest.fn().mockResolvedValue('hashed_pw'),
}));

const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  location: {
    findFirst: jest.fn(),
  },
};
jest.mock('@/lib/db', () => ({ prisma: mockPrisma }));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(method: string, body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/settings/users', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeIdReq(id: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/settings/users/${id}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('/api/settings/users GET', () => {
  let GET: () => Promise<Response>;
  const { getSession } = require('@/lib/auth') as { getSession: jest.Mock };

  beforeAll(async () => {
    const mod = await import('@/app/api/settings/users/route');
    GET = mod.GET;
  });

  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    getSession.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 403 for AGENT', async () => {
    getSession.mockResolvedValueOnce(agentSession);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('returns user list for OWNER', async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    mockPrisma.user.findMany.mockResolvedValueOnce([
      { id: 'u1', name: 'Alice', email: 'a@test.com', role: 'OWNER', createdAt: new Date(), location: null },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users).toHaveLength(1);
  });

  it('returns user list for MANAGER', async () => {
    getSession.mockResolvedValueOnce(managerSession);
    mockPrisma.user.findMany.mockResolvedValueOnce([]);
    const res = await GET();
    expect(res.status).toBe(200);
  });
});

describe('/api/settings/users POST', () => {
  let POST: (req: NextRequest) => Promise<Response>;
  const { getSession } = require('@/lib/auth') as { getSession: jest.Mock };

  beforeAll(async () => {
    const mod = await import('@/app/api/settings/users/route');
    POST = mod.POST;
  });

  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    getSession.mockResolvedValueOnce(null);
    const res = await POST(makeReq('POST', { name: 'X', email: 'x@t.com', password: 'pass1234' }));
    expect(res.status).toBe(401);
  });

  it('returns 403 for AGENT', async () => {
    getSession.mockResolvedValueOnce(agentSession);
    const res = await POST(makeReq('POST', { name: 'X', email: 'x@t.com', password: 'pass1234' }));
    expect(res.status).toBe(403);
  });

  it('returns 400 when name is missing', async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    const res = await POST(makeReq('POST', { email: 'x@t.com', password: 'pass1234' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when email is missing', async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    const res = await POST(makeReq('POST', { name: 'X', password: 'pass1234' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is too short', async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    const res = await POST(makeReq('POST', { name: 'X', email: 'x@t.com', password: '123' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/password/i);
  });

  it('returns 400 for invalid role', async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    const res = await POST(makeReq('POST', { name: 'X', email: 'x@t.com', password: 'pass1234', role: 'SUPERADMIN' }));
    expect(res.status).toBe(400);
  });

  it('returns 403 when MANAGER tries to create OWNER', async () => {
    getSession.mockResolvedValueOnce(managerSession);
    const res = await POST(makeReq('POST', { name: 'X', email: 'x@t.com', password: 'pass1234', role: 'OWNER' }));
    expect(res.status).toBe(403);
  });

  it('returns 409 when email already in use', async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'existing' });
    const res = await POST(makeReq('POST', { name: 'X', email: 'taken@t.com', password: 'pass1234' }));
    expect(res.status).toBe(409);
  });

  it('creates user successfully', async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    mockPrisma.user.findUnique.mockResolvedValueOnce(null); // not duplicate
    mockPrisma.user.create.mockResolvedValueOnce({
      id: 'u_new', name: 'New User', email: 'new@t.com', role: 'AGENT',
      createdAt: new Date(), location: null,
    });
    const res = await POST(makeReq('POST', { name: 'New User', email: 'new@t.com', password: 'pass1234', role: 'AGENT' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.user.name).toBe('New User');
  });

  it('normalizes email to lowercase on creation', async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockPrisma.user.create.mockResolvedValueOnce({
      id: 'u2', name: 'Y', email: 'upper@t.com', role: 'AGENT', createdAt: new Date(), location: null,
    });
    await POST(makeReq('POST', { name: 'Y', email: 'UPPER@T.COM', password: 'pass1234' }));
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'upper@t.com' }),
      })
    );
  });
});

describe('/api/settings/users/[id] DELETE', () => {
  let DELETE: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
  const { getSession } = require('@/lib/auth') as { getSession: jest.Mock };

  beforeAll(async () => {
    const mod = await import('@/app/api/settings/users/[id]/route');
    DELETE = mod.DELETE;
  });

  beforeEach(() => jest.clearAllMocks());

  const makeCtx = (id: string) => ({ params: Promise.resolve({ id }) });

  it('returns 401 when unauthenticated', async () => {
    getSession.mockResolvedValueOnce(null);
    const res = await DELETE(makeIdReq('u_other', 'DELETE'), makeCtx('u_other'));
    expect(res.status).toBe(401);
  });

  it('returns 403 for MANAGER (only OWNER can delete)', async () => {
    getSession.mockResolvedValueOnce(managerSession);
    const res = await DELETE(makeIdReq('u_other', 'DELETE'), makeCtx('u_other'));
    expect(res.status).toBe(403);
  });

  it('returns 400 when trying to delete own account', async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    const res = await DELETE(makeIdReq('u_owner', 'DELETE'), makeCtx('u_owner'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/own account/i);
  });

  it('returns 404 when user not found in org', async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    mockPrisma.user.findFirst.mockResolvedValueOnce(null);
    const res = await DELETE(makeIdReq('u_ghost', 'DELETE'), makeCtx('u_ghost'));
    expect(res.status).toBe(404);
  });

  it('deletes user successfully', async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 'u_agent', role: 'AGENT' });
    mockPrisma.user.delete.mockResolvedValueOnce({});
    const res = await DELETE(makeIdReq('u_agent', 'DELETE'), makeCtx('u_agent'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
