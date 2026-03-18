import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const locations = await prisma.location.findMany({
    where: { organizationId: session.organization.id },
    include: { _count: { select: { users: true, transactions: true } } },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ locations });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Only owners can add locations' }, { status: 403 });
  }

  const body = await req.json();
  const { name, address, city, state, zip, phone, licenseNumber } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Location name is required' }, { status: 400 });
  }

  const location = await prisma.location.create({
    data: {
      name: name.trim(),
      address: address?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      zip: zip?.trim() || null,
      phone: phone?.trim() || null,
      licenseNumber: licenseNumber?.trim() || null,
      organizationId: session.organization.id,
    },
  });

  return NextResponse.json({ location }, { status: 201 });
}
