import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getActiveLocation, getOrgLocations, setActiveLocationCookie } from '@/lib/location';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [active, locations] = await Promise.all([
    getActiveLocation(session),
    getOrgLocations(session.organization.id),
  ]);

  return NextResponse.json({ active, locations });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.user.role === 'AGENT') {
    return NextResponse.json({ error: 'Agents cannot switch locations' }, { status: 403 });
  }

  const { locationId } = await req.json();

  if (locationId !== 'all') {
    const { prisma } = await import('@/lib/db');
    const loc = await prisma.location.findFirst({
      where: { id: locationId, organizationId: session.organization.id },
    });
    if (!loc) return NextResponse.json({ error: 'Location not found' }, { status: 400 });
  }

  await setActiveLocationCookie(locationId);
  return NextResponse.json({ ok: true });
}
