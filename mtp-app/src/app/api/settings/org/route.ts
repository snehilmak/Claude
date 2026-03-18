import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const org = await prisma.organization.findUnique({
    where: { id: session.organization.id },
    select: {
      id: true, name: true, email: true, phone: true,
      address: true, city: true, state: true, zip: true, country: true,
      subscriptionStatus: true, trialEndsAt: true, createdAt: true,
    },
  });

  return NextResponse.json({ org });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.user.role !== 'OWNER' && session.user.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await req.json();
  const { name, phone, address, city, state, zip, country } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Organization name is required' }, { status: 400 });
  }

  const org = await prisma.organization.update({
    where: { id: session.organization.id },
    data: {
      name: name.trim(),
      phone: phone?.trim() || null,
      address: address?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      zip: zip?.trim() || null,
      country: country || 'US',
    },
  });

  return NextResponse.json({ org });
}
