import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.user.role !== 'OWNER' && session.user.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { name, role, locationId } = body;

  // Verify user belongs to this org
  const target = await prisma.user.findFirst({
    where: { id, organizationId: session.organization.id },
  });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Managers cannot change OWNER accounts or promote to OWNER
  if (session.user.role === 'MANAGER') {
    if (target.role === 'OWNER' || role === 'OWNER') {
      return NextResponse.json({ error: 'Managers cannot modify owner accounts' }, { status: 403 });
    }
  }

  if (locationId) {
    const loc = await prisma.location.findFirst({
      where: { id: locationId, organizationId: session.organization.id },
    });
    if (!loc) return NextResponse.json({ error: 'Invalid location' }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(name ? { name: name.trim() } : {}),
      ...(role ? { role } : {}),
      ...(locationId !== undefined ? { locationId: locationId || null } : {}),
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true,
      location: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ user });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Only owners can delete users' }, { status: 403 });
  }

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  const target = await prisma.user.findFirst({
    where: { id, organizationId: session.organization.id },
  });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
