import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const tx = await prisma.transaction.findFirst({
    where: { id, organizationId: session.organization.id },
    include: { customer: true, company: true, agent: { select: { name: true } }, location: { select: { name: true } } },
  });

  if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ transaction: tx });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const tx = await prisma.transaction.findFirst({
    where: { id, organizationId: session.organization.id },
  });
  if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const {
    status, cancelReason, cancelledAt,
    refundDate, refundVerified,
    referenceNumber, controlNumber, notes,
  } = body;

  const updateData: Record<string, unknown> = {};
  if (status !== undefined) updateData.status = status;
  if (cancelReason !== undefined) updateData.cancelReason = cancelReason;
  if (cancelledAt !== undefined) updateData.cancelledAt = cancelledAt ? new Date(cancelledAt) : null;
  if (refundDate !== undefined) updateData.refundDate = refundDate ? new Date(refundDate) : null;
  if (refundVerified !== undefined) updateData.refundVerified = refundVerified;
  if (referenceNumber !== undefined) updateData.referenceNumber = referenceNumber;
  if (controlNumber !== undefined) updateData.controlNumber = controlNumber;
  if (notes !== undefined) updateData.notes = notes;

  const updated = await prisma.transaction.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ transaction: updated });
}
