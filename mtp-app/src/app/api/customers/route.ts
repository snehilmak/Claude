import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const q = req.nextUrl.searchParams.get('q');

  const customers = await prisma.customer.findMany({
    where: {
      organizationId: session.organization.id,
      ...(q ? {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
        ],
      } : {}),
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    take: 200,
  });

  return NextResponse.json({ customers });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { firstName, lastName, middleName, dateOfBirth, phone, email,
    address, city, state, zip, country, idType, idNumber, idIssuedBy, idExpiresAt } = body;

  if (!firstName || !lastName || !phone) {
    return NextResponse.json({ error: 'First name, last name, and phone are required' }, { status: 400 });
  }

  const customer = await prisma.customer.create({
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      middleName: middleName?.trim() || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      phone: phone.trim(),
      email: email?.trim() || null,
      address: address?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      zip: zip?.trim() || null,
      country: country || 'US',
      idType: idType || null,
      idNumber: idNumber?.trim() || null,
      idIssuedBy: idIssuedBy?.trim() || null,
      idExpiresAt: idExpiresAt ? new Date(idExpiresAt) : null,
      organizationId: session.organization.id,
    },
  });

  return NextResponse.json({ customer }, { status: 201 });
}
