/**
 * Unit tests for /api/transactions/quick — the core Quick Entry POST endpoint.
 */
import { NextRequest } from 'next/server';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const ownerSession = {
  user: { id: 'u_owner', role: 'OWNER', locationId: null, location: null },
  organization: { id: 'org_1' },
};
const agentSession = {
  user: { id: 'u_agent', role: 'AGENT', locationId: 'loc_1', location: { id: 'loc_1', name: 'Main' } },
  organization: { id: 'org_1' },
};
const agentNoLocSession = {
  user: { id: 'u_noloc', role: 'AGENT', locationId: null, location: null },
  organization: { id: 'org_1' },
};

jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }));

jest.mock('@/lib/location', () => ({
  getActiveLocation: jest.fn(),
  locationWhereClause: jest.fn().mockReturnValue({}),
}));

const mockPrisma = {
  transaction: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  customer: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  location: {
    findFirst: jest.fn(),
  },
};
jest.mock('@/lib/db', () => ({ prisma: mockPrisma }));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/transactions/quick', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  recipientName: 'Juan Garcia',
  recipientCountry: 'MX',
  companyId: 'co_1',
  amount: '200',
  senderPhone: '555-0001',
  senderName: 'Maria Garcia',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('/api/transactions/quick POST', () => {
  let POST: (req: NextRequest) => Promise<Response>;
  const { getSession } = require('@/lib/auth') as { getSession: jest.Mock };
  const { getActiveLocation } = require('@/lib/location') as { getActiveLocation: jest.Mock };

  beforeAll(async () => {
    const mod = await import('@/app/api/transactions/quick/route');
    POST = mod.POST;
  });

  beforeEach(() => jest.clearAllMocks());

  // ── Auth + required fields ──

  it('returns 401 when unauthenticated', async () => {
    getSession.mockResolvedValueOnce(null);
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(401);
  });

  it('returns 400 when recipientName is missing', async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    getActiveLocation.mockResolvedValueOnce({ mode: 'all' });
    const res = await POST(makeReq({ ...validBody, recipientName: undefined }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when recipientCountry is missing', async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    getActiveLocation.mockResolvedValueOnce({ mode: 'all' });
    const res = await POST(makeReq({ ...validBody, recipientCountry: undefined }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when companyId is missing', async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    getActiveLocation.mockResolvedValueOnce({ mode: 'all' });
    const res = await POST(makeReq({ ...validBody, companyId: undefined }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when amount is missing', async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    getActiveLocation.mockResolvedValueOnce({ mode: 'all' });
    const res = await POST(makeReq({ ...validBody, amount: undefined }));
    expect(res.status).toBe(400);
  });

  // ── AGENT location constraint ──

  it('returns 400 when AGENT has no assigned location', async () => {
    getSession.mockResolvedValueOnce(agentNoLocSession);
    getActiveLocation.mockResolvedValueOnce({ mode: 'all' });
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/location/i);
  });

  // ── Customer auto-create ──

  it('uses existing customer when phone matches', async () => {
    getSession.mockResolvedValueOnce(agentSession);
    getActiveLocation.mockResolvedValueOnce({ mode: 'single', locationId: 'loc_1' });
    mockPrisma.customer.findFirst.mockResolvedValueOnce({
      id: 'cust_1', firstName: 'Maria', lastName: 'Garcia', phone: '555-0001',
    });
    mockPrisma.transaction.create.mockResolvedValueOnce({ id: 'tx_1' });

    await POST(makeReq(validBody));

    expect(mockPrisma.customer.create).not.toHaveBeenCalled();
    expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ customerId: 'cust_1' }),
      })
    );
  });

  it('auto-creates customer when phone not found but senderName provided', async () => {
    getSession.mockResolvedValueOnce(agentSession);
    getActiveLocation.mockResolvedValueOnce({ mode: 'single', locationId: 'loc_1' });
    mockPrisma.customer.findFirst.mockResolvedValueOnce(null); // no existing customer
    mockPrisma.customer.create.mockResolvedValueOnce({
      id: 'cust_new', firstName: 'Maria', lastName: 'Garcia',
    });
    mockPrisma.transaction.create.mockResolvedValueOnce({ id: 'tx_1' });

    await POST(makeReq(validBody));

    expect(mockPrisma.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: 'Maria',
          lastName: 'Garcia',
          phone: '555-0001',
          organizationId: 'org_1',
        }),
      })
    );
  });

  it('creates transaction with correct locationId for AGENT', async () => {
    getSession.mockResolvedValueOnce(agentSession);
    getActiveLocation.mockResolvedValueOnce({ mode: 'single', locationId: 'loc_1' });
    mockPrisma.customer.findFirst.mockResolvedValueOnce({ id: 'c1' });
    mockPrisma.transaction.create.mockResolvedValueOnce({ id: 'tx_new' });

    await POST(makeReq(validBody));

    expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          locationId: 'loc_1',
          agentId: 'u_agent',
          organizationId: 'org_1',
        }),
      })
    );
  });

  it('sets totalCollected to the send amount', async () => {
    getSession.mockResolvedValueOnce(agentSession);
    getActiveLocation.mockResolvedValueOnce({ mode: 'single', locationId: 'loc_1' });
    mockPrisma.customer.findFirst.mockResolvedValueOnce({ id: 'c1' });
    mockPrisma.transaction.create.mockResolvedValueOnce({ id: 'tx_1' });

    await POST(makeReq({ ...validBody, amount: '350' }));

    expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sendAmount: 350,
          totalCollected: 350,
        }),
      })
    );
  });
});
