/**
 * Unit tests for /api/settings/companies (GET + POST/upsert)
 */
import { NextRequest } from 'next/server';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const ownerSession = {
  user: { id: 'u_owner', role: 'OWNER', locationId: null, location: null },
  organization: { id: 'org_1' },
};
const agentSession = {
  user: { id: 'u_agent', role: 'AGENT', locationId: 'loc_1', location: null },
  organization: { id: 'org_1' },
};

jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }));

const mockPrisma = {
  transferCompany: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  companyConfig: {
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
};
jest.mock('@/lib/db', () => ({ prisma: mockPrisma }));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('/api/settings/companies', () => {
  let GET: () => Promise<Response>;
  let POST: (req: NextRequest) => Promise<Response>;
  const { getSession } = require('@/lib/auth') as { getSession: jest.Mock };

  beforeAll(async () => {
    const mod = await import('@/app/api/settings/companies/route');
    GET = mod.GET;
    POST = mod.POST;
  });

  beforeEach(() => jest.clearAllMocks());

  const makeReq = (body: unknown) =>
    new NextRequest('http://localhost/api/settings/companies', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });

  // ── GET ──

  it('GET returns 401 when unauthenticated', async () => {
    getSession.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('GET returns merged companies + configs', async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    mockPrisma.transferCompany.findMany.mockResolvedValueOnce([
      { id: 'co_1', name: 'Intermex', code: 'INTERMEX' },
      { id: 'co_2', name: 'Ria', code: 'RIA' },
    ]);
    mockPrisma.companyConfig.findMany.mockResolvedValueOnce([
      { companyId: 'co_1', agentCode: 'AGENT123', accountNumber: null, isEnabled: true },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.companies).toHaveLength(2);
    const intermex = body.companies.find((c: { name: string }) => c.name === 'Intermex');
    expect(intermex.config.agentCode).toBe('AGENT123');
    const ria = body.companies.find((c: { name: string }) => c.name === 'Ria');
    expect(ria.config).toBeNull();
  });

  // ── POST ──

  it('POST returns 401 when unauthenticated', async () => {
    getSession.mockResolvedValueOnce(null);
    const res = await POST(makeReq({ companyId: 'co_1', agentCode: 'X' }));
    expect(res.status).toBe(401);
  });

  it('POST returns 403 for AGENT', async () => {
    getSession.mockResolvedValueOnce(agentSession);
    const res = await POST(makeReq({ companyId: 'co_1', agentCode: 'X' }));
    expect(res.status).toBe(403);
  });

  it('POST returns 400 when companyId is missing', async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    const res = await POST(makeReq({ agentCode: 'X' }));
    expect(res.status).toBe(400);
  });

  it('POST returns 404 when company does not exist', async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    mockPrisma.transferCompany.findUnique.mockResolvedValueOnce(null);
    const res = await POST(makeReq({ companyId: 'nonexistent' }));
    expect(res.status).toBe(404);
  });

  it('POST upserts company config successfully', async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    mockPrisma.transferCompany.findUnique.mockResolvedValueOnce({ id: 'co_1', name: 'Intermex' });
    const savedConfig = { id: 'cfg_1', companyId: 'co_1', agentCode: 'AGENT123', isEnabled: true };
    mockPrisma.companyConfig.upsert.mockResolvedValueOnce(savedConfig);

    const res = await POST(makeReq({ companyId: 'co_1', agentCode: 'AGENT123', isEnabled: true }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.config.agentCode).toBe('AGENT123');
  });

  it('POST trims whitespace from agent code', async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    mockPrisma.transferCompany.findUnique.mockResolvedValueOnce({ id: 'co_1' });
    mockPrisma.companyConfig.upsert.mockResolvedValueOnce({ companyId: 'co_1', agentCode: 'X' });

    await POST(makeReq({ companyId: 'co_1', agentCode: '  X  ' }));

    expect(mockPrisma.companyConfig.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ agentCode: 'X' }),
        update: expect.objectContaining({ agentCode: 'X' }),
      })
    );
  });

  it('POST sets empty agent code to null', async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    mockPrisma.transferCompany.findUnique.mockResolvedValueOnce({ id: 'co_1' });
    mockPrisma.companyConfig.upsert.mockResolvedValueOnce({ companyId: 'co_1', agentCode: null });

    await POST(makeReq({ companyId: 'co_1', agentCode: '' }));

    expect(mockPrisma.companyConfig.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ agentCode: null }),
      })
    );
  });
});
