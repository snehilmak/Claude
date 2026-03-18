import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [allCompanies, configs] = await Promise.all([
    prisma.transferCompany.findMany({ orderBy: { name: 'asc' } }),
    prisma.companyConfig.findMany({
      where: { organizationId: session.organization.id },
    }),
  ]);

  const configMap = new Map(configs.map((c) => [c.companyId, c]));

  const companies = allCompanies.map((co) => ({
    ...co,
    config: configMap.get(co.id) ?? null,
  }));

  return NextResponse.json({ companies });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.user.role !== 'OWNER' && session.user.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await req.json();
  const { companyId, agentCode, accountNumber, apiKey, notes, isEnabled } = body;

  if (!companyId) {
    return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
  }

  const company = await prisma.transferCompany.findUnique({ where: { id: companyId } });
  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

  const config = await prisma.companyConfig.upsert({
    where: { organizationId_companyId: { organizationId: session.organization.id, companyId } },
    create: {
      organizationId: session.organization.id,
      companyId,
      agentCode: agentCode?.trim() || null,
      accountNumber: accountNumber?.trim() || null,
      apiKey: apiKey?.trim() || null,
      notes: notes?.trim() || null,
      isEnabled: isEnabled ?? true,
    },
    update: {
      agentCode: agentCode?.trim() || null,
      accountNumber: accountNumber?.trim() || null,
      apiKey: apiKey?.trim() || null,
      notes: notes?.trim() || null,
      isEnabled: isEnabled ?? true,
    },
  });

  return NextResponse.json({ config });
}
