import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';

export default async function CompaniesPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const [allCompanies, configs] = await Promise.all([
    prisma.transferCompany.findMany({ orderBy: { name: 'asc' } }),
    prisma.companyConfig.findMany({
      where: { organizationId: session.organization.id },
      select: { companyId: true, isEnabled: true, agentCode: true },
    }),
  ]);

  const configMap = new Map(configs.map((c) => [c.companyId, c]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transfer Companies</h1>
        <p className="text-sm text-gray-500">
          Companies available on the platform. Contact support to configure your agent codes.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {allCompanies.map((company) => {
          const config = configMap.get(company.id);
          const isEnabled = config?.isEnabled ?? false;
          return (
            <Card key={company.id}>
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base">{company.name}</CardTitle>
                  <p className="text-xs font-mono text-gray-400">{company.code}</p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    {config?.agentCode && (
                      <p className="text-xs text-gray-500">
                        Agent: <span className="font-mono">{config.agentCode}</span>
                      </p>
                    )}
                  </div>
                  <Badge variant={isEnabled ? 'success' : 'default'}>
                    {isEnabled ? 'Enabled' : 'Not Configured'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-gray-600">
            To enable a company and add your agent codes, go to{' '}
            <strong>Settings → Company Configuration</strong> or contact support at{' '}
            <a href="mailto:support@mtpplatform.com" className="text-blue-600 hover:underline">
              support@mtpplatform.com
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
