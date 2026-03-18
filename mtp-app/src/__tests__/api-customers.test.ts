/**
 * Unit tests for /api/customers — validation, auth checks, and business rules.
 * Prisma and auth are fully mocked; no DB connection required.
 */
import { NextRequest } from 'next/server';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSession = {
  user: { id: 'user_1', name: 'Alice', role: 'OWNER', locationId: 'loc_1', location: null },
  organization: { id: 'org_1', name: 'Test Org' },
};

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}));

jest.mock('@/lib/location', () => ({
  getActiveLocation: jest.fn().mockResolvedValue({ mode: 'all' }),
  locationWhereClause: jest.fn().mockReturnValue({}),
}));

const mockPrisma = {
  customer: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('@/lib/db', () => ({ prisma: mockPrisma }));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/customers');
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString(), { method: 'GET' });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('/api/customers', () => {
  let GET: (req: NextRequest) => Promise<Response>;
  let POST: (req: NextRequest) => Promise<Response>;
  const { getSession } = require('@/lib/auth') as { getSession: jest.Mock };

  beforeAll(async () => {
    const mod = await import('@/app/api/customers/route');
    GET = mod.GET;
    POST = mod.POST;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Auth guard ──

  it('GET returns 401 when not authenticated', async () => {
    getSession.mockResolvedValueOnce(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it('POST returns 401 when not authenticated', async () => {
    getSession.mockResolvedValueOnce(null);
    const res = await POST(makePostRequest({ firstName: 'A', lastName: 'B', phone: '555' }));
    expect(res.status).toBe(401);
  });

  // ── GET customers ──

  it('GET returns customer list for authenticated user', async () => {
    getSession.mockResolvedValueOnce(mockSession);
    mockPrisma.customer.findMany.mockResolvedValueOnce([
      { id: 'c1', firstName: 'Maria', lastName: 'Garcia', phone: '555-0001' },
    ]);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.customers).toHaveLength(1);
    expect(body.customers[0].firstName).toBe('Maria');
  });

  it('GET returns empty array when no customers exist', async () => {
    getSession.mockResolvedValueOnce(mockSession);
    mockPrisma.customer.findMany.mockResolvedValueOnce([]);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.customers).toEqual([]);
  });

  it('GET passes search query to prisma', async () => {
    getSession.mockResolvedValueOnce(mockSession);
    mockPrisma.customer.findMany.mockResolvedValueOnce([]);
    await GET(makeGetRequest({ q: 'Maria' }));
    expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.any(Array),
        }),
      })
    );
  });

  // ── POST — validation ──

  it('POST returns 400 when firstName is missing', async () => {
    getSession.mockResolvedValueOnce(mockSession);
    const res = await POST(makePostRequest({ lastName: 'Garcia', phone: '555-0001' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it('POST returns 400 when lastName is missing', async () => {
    getSession.mockResolvedValueOnce(mockSession);
    const res = await POST(makePostRequest({ firstName: 'Maria', phone: '555-0001' }));
    expect(res.status).toBe(400);
  });

  it('POST returns 400 when phone is missing', async () => {
    getSession.mockResolvedValueOnce(mockSession);
    const res = await POST(makePostRequest({ firstName: 'Maria', lastName: 'Garcia' }));
    expect(res.status).toBe(400);
  });

  it('POST creates customer with valid data', async () => {
    getSession.mockResolvedValueOnce(mockSession);
    const created = {
      id: 'c_new', firstName: 'Maria', lastName: 'Garcia', phone: '555-0001',
      organizationId: 'org_1',
    };
    mockPrisma.customer.create.mockResolvedValueOnce(created);

    const res = await POST(makePostRequest({
      firstName: 'Maria', lastName: 'Garcia', phone: '555-0001',
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.customer.firstName).toBe('Maria');
  });

  it('POST trims whitespace from name fields', async () => {
    getSession.mockResolvedValueOnce(mockSession);
    mockPrisma.customer.create.mockResolvedValueOnce({
      id: 'c2', firstName: 'Maria', lastName: 'Garcia', phone: '555',
    });

    await POST(makePostRequest({ firstName: '  Maria  ', lastName: '  Garcia  ', phone: '555' }));

    expect(mockPrisma.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: 'Maria',
          lastName: 'Garcia',
        }),
      })
    );
  });

  it('POST sets optional fields to null when not provided', async () => {
    getSession.mockResolvedValueOnce(mockSession);
    mockPrisma.customer.create.mockResolvedValueOnce({ id: 'c3', firstName: 'A', lastName: 'B', phone: '555' });

    await POST(makePostRequest({ firstName: 'A', lastName: 'B', phone: '555' }));

    expect(mockPrisma.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: null,
          address: null,
          city: null,
          idType: null,
          idNumber: null,
        }),
      })
    );
  });

  it('POST links customer to organization', async () => {
    getSession.mockResolvedValueOnce(mockSession);
    mockPrisma.customer.create.mockResolvedValueOnce({ id: 'c4', firstName: 'A', lastName: 'B', phone: '555' });

    await POST(makePostRequest({ firstName: 'A', lastName: 'B', phone: '555' }));

    expect(mockPrisma.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 'org_1' }),
      })
    );
  });
});
