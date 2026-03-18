/**
 * Unit tests for /api/auth/register validation logic.
 *
 * We test the request-level validation rules by mocking Prisma and Next.js
 * internals so no real DB connection is needed.
 */
import { NextRequest } from 'next/server';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock prisma (no real DB)
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    location: {
      create: jest.fn(),
    },
    session: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Mock auth helpers
jest.mock('@/lib/auth', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed_password'),
  createSession: jest.fn().mockResolvedValue('session_token'),
  getSession: jest.fn().mockResolvedValue(null),
}));

// Mock next/headers (cookies)
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    set: jest.fn(),
    get: jest.fn(),
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('/api/auth/register — input validation', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import('@/app/api/auth/register/route');
    POST = mod.POST;
  });

  it('returns 400 when orgName is missing', async () => {
    const req = makeRequest({ name: 'Alice', email: 'a@test.com', password: 'pass1234' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it('returns 400 when email is missing', async () => {
    const req = makeRequest({ orgName: 'My Org', name: 'Alice', password: 'pass1234' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const req = makeRequest({ orgName: 'My Org', name: 'Alice', email: 'a@test.com' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is too short (< 8 chars)', async () => {
    const req = makeRequest({ orgName: 'My Org', name: 'Alice', email: 'a@test.com', password: '1234' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/password/i);
  });

  it('returns 400 when name is missing', async () => {
    const req = makeRequest({ orgName: 'My Org', email: 'a@test.com', password: 'pass1234' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
