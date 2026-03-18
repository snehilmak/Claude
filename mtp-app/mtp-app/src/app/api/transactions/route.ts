import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status');
  const companyId = searchParams.get('company');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const where: Record<string, unknown> = { organizationId: session.organization.id };
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
  } = body;

  if (!customerId || !recipientName || !recipientCountry || !companyId || !sendAmount || !exchangeRate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Verify customer belongs to this org
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: session.organization.id },
  });
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  if (customer.isBlocked) return NextResponse.json({ error: 'Customer is blocked' }, { status: 400 });

  // Get default location
  const location = await prisma.location.findFirst({
    where: { organizationId: session.organization.id },
  });
  if (!location) return NextResponse.json({ error: 'No location configured' }, { status: 400 });

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
      receiveCurrency: 'MXN', // TODO: derive from country
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
      locationId: location.id,
      agentId: session.user.id,
    },
  });

  return NextResponse.json({ transaction: tx }, { status: 201 });
}
