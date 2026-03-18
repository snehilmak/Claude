import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getActiveLocation, locationWhereClause } from '@/lib/location';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const active = await getActiveLocation(session);
  const locWhere = locationWhereClause(active);

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status');
  const companyId = searchParams.get('company');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const where: Record<string, unknown> = {
    organizationId: session.organization.id,
    ...locWhere,
  };
  if (status) where.status = status;
  if (companyId) where.companyId = companyId;
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, Date>).gte = new Date(from);
    if (to) (where.createdAt as Record<string, Date>).lte = new Date(to);
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: { customer: true, company: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return NextResponse.json({ transactions });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const {
    customerId, recipientName, recipientPhone, recipientCity, recipientCountry,
    companyId, sendAmount, exchangeRate, receiveAmount, fee, totalCollected,
    paymentMethod, referenceNumber, controlNumber,
    purposeOfTransfer, sourceOfFunds, notes,
    locationId: bodyLocationId,
  } = body;

  if (!customerId || !recipientName || !recipientCountry || !companyId || !sendAmount || !exchangeRate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Resolve the location for this transaction
  const active = await getActiveLocation(session);
  let resolvedLocationId: string;

  if (session.user.role === 'AGENT') {
    // Agents are locked to their assigned location
    if (!session.user.locationId) {
      return NextResponse.json({ error: 'Agent is not assigned to a location' }, { status: 400 });
    }
    resolvedLocationId = session.user.locationId;
  } else if (active.mode === 'single') {
    resolvedLocationId = active.locationId;
  } else {
    // Owner/Manager in "all" mode — body may provide a specific locationId
    if (bodyLocationId) {
      const loc = await prisma.location.findFirst({
        where: { id: bodyLocationId, organizationId: session.organization.id },
      });
      if (!loc) return NextResponse.json({ error: 'Invalid location' }, { status: 400 });
      resolvedLocationId = bodyLocationId;
    } else {
      // Default to first location
      const loc = await prisma.location.findFirst({
        where: { organizationId: session.organization.id },
        orderBy: { createdAt: 'asc' },
      });
      if (!loc) return NextResponse.json({ error: 'No location configured' }, { status: 400 });
      resolvedLocationId = loc.id;
    }
  }

  // Verify customer belongs to this org
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: session.organization.id },
  });
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  if (customer.isBlocked) return NextResponse.json({ error: 'Customer is blocked' }, { status: 400 });

  const tx = await prisma.transaction.create({
    data: {
      customerId,
      recipientName,
      recipientPhone: recipientPhone || null,
      recipientCity: recipientCity || null,
      recipientCountry,
      companyId,
      sendAmount: parseFloat(sendAmount),
      exchangeRate: parseFloat(exchangeRate),
      receiveAmount: parseFloat(receiveAmount ?? '0'),
      receiveCurrency: 'MXN',
      fee: parseFloat(fee ?? '0'),
      totalCollected: parseFloat(totalCollected ?? sendAmount),
      paymentMethod: paymentMethod ?? 'CASH',
      referenceNumber: referenceNumber || null,
      controlNumber: controlNumber || null,
      purposeOfTransfer: purposeOfTransfer || null,
      sourceOfFunds: sourceOfFunds || null,
      notes: notes || null,
      status: 'PENDING',
      organizationId: session.organization.id,
      locationId: resolvedLocationId,
      agentId: session.user.id,
    },
  });

  return NextResponse.json({ transaction: tx }, { status: 201 });
}
