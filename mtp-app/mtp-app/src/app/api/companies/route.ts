import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companies = await prisma.transferCompany.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ companies });
}
