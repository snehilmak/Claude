import { NextRequest, NextResponse } from 'next/server';
import { getSession, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.user.role === 'AGENT') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { organizationId: session.organization.id },
    select: {
      id: true, name: true, email: true, role: true, createdAt: true,
      location: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.user.role !== 'OWNER' && session.user.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, password, role, locationId } = body;

  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const validRoles = ['OWNER', 'MANAGER', 'AGENT'];
  if (role && !validRoles.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  // Only OWNER can create another OWNER
  if (role === 'OWNER' && session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Only owners can create owner accounts' }, { status: 403 });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
  }

  // Validate location belongs to this org
  if (locationId) {
    const loc = await prisma.location.findFirst({
      where: { id: locationId, organizationId: session.organization.id },
    });
    if (!loc) return NextResponse.json({ error: 'Invalid location' }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: role || 'AGENT',
      organizationId: session.organization.id,
      locationId: locationId || null,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true,
      location: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ user }, { status: 201 });
}
