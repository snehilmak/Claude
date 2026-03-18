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
  const { name, address, city, state, zip, phone, licenseNumber } = body;

  const location = await prisma.location.findFirst({
    where: { id, organizationId: session.organization.id },
  });
  if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 });

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Location name is required' }, { status: 400 });
  }

  const updated = await prisma.location.update({
    where: { id },
    data: {
      name: name.trim(),
      address: address?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      zip: zip?.trim() || null,
      phone: phone?.trim() || null,
      licenseNumber: licenseNumber?.trim() || null,
    },
  });

  return NextResponse.json({ location: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Only owners can delete locations' }, { status: 403 });
  }

  const { id } = await params;

  const location = await prisma.location.findFirst({
    where: { id, organizationId: session.organization.id },
  });
  if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 });

  // Check for remaining locations — must keep at least one
  const count = await prisma.location.count({
    where: { organizationId: session.organization.id },
  });
  if (count <= 1) {
    return NextResponse.json({ error: 'Cannot delete the only location' }, { status: 400 });
  }

  await prisma.location.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
