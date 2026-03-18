import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getActiveLocation, locationWhereClause } from '@/lib/location';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const active = await getActiveLocation(session);
  const locWhere = locationWhereClause(active);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const transactions = await prisma.transaction.findMany({
    where: {
      organizationId: session.organization.id,
      ...locWhere,
      createdAt: { gte: today },
    },
    include: {
      customer: { select: { firstName: true, lastName: true, phone: true } },
      company: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return NextResponse.json({ transactions });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { controlNumber, senderPhone, senderName, recipientName, recipientCountry, companyId, amount, notes, locationId: bodyLocationId } = body;

  if (!recipientName || !recipientCountry || !companyId || !amount) {
    return NextResponse.json({ error: 'Recipient, country, company, and amount are required' }, { status: 400 });
  }

  // Resolve location
  const active = await getActiveLocation(session);
  let resolvedLocationId: string;

  if (session.user.role === 'AGENT') {
    if (!session.user.locationId) return NextResponse.json({ error: 'Agent has no assigned location' }, { status: 400 });
    resolvedLocationId = session.user.locationId;
  } else if (active.mode === 'single') {
    resolvedLocationId = active.locationId;
  } else {
    if (bodyLocationId) {
      const loc = await prisma.location.findFirst({ where: { id: bodyLocationId, organizationId: session.organization.id } });
      if (!loc) return NextResponse.json({ error: 'Invalid location' }, { status: 400 });
      resolvedLocationId = bodyLocationId;
    } else {
      const loc = await prisma.location.findFirst({ where: { organizationId: session.organization.id }, orderBy: { createdAt: 'asc' } });
      if (!loc) return NextResponse.json({ error: 'No location configured' }, { status: 400 });
      resolvedLocationId = loc.id;
    }
  }

  // Look up or auto-create customer by phone
  let customer = senderPhone
    ? await prisma.customer.findFirst({ where: { phone: senderPhone.trim(), organizationId: session.organization.id } })
    : null;

  if (!customer && senderName) {
    const parts = senderName.trim().split(/\s+/);
    const firstName = parts[0] ?? 'Unknown';
    const lastName = parts.slice(1).join(' ') || '—';
    customer = await prisma.customer.create({
      data: {
        firstName,
        lastName,
        phone: senderPhone?.trim() ?? '—',
        organizationId: session.organization.id,
      },
    });
  }

  if (!customer) return NextResponse.json({ error: 'Sender information is required' }, { status: 400 });

  const tx = await prisma.transaction.create({
    data: {
      controlNumber: controlNumber?.trim() || null,
      senderPhone: senderPhone?.trim() || null,
      customerId: customer.id,
      recipientName: recipientName.trim(),
      recipientCountry,
      companyId,
      sendAmount: parseFloat(amount),
      totalCollected: parseFloat(amount),
      fee: 0,
      paymentMethod: 'CASH',
      notes: notes?.trim() || null,
      status: 'PENDING',
      organizationId: session.organization.id,
      locationId: resolvedLocationId,
      agentId: session.user.id,
    },
  });

  return NextResponse.json({ transaction: tx }, { status: 201 });
}
