import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const COMPANIES = [
  { name: 'Intermex', code: 'INTERMEX' },
  { name: 'Vigo', code: 'VIGO' },
  { name: 'Ria Money Transfer', code: 'RIA' },
  { name: 'Barri Financial', code: 'BARRI' },
  { name: 'Maxi', code: 'MAXI' },
  { name: 'MoneyGram', code: 'MONEYGRAM' },
  { name: 'ViaAmericas', code: 'VIAMERICAS' },
  { name: 'Western Union', code: 'WESTERN_UNION' },
  { name: 'Sigue', code: 'SIGUE' },
  { name: 'Dolex', code: 'DOLEX' },
  { name: 'Small World', code: 'SMALL_WORLD' },
  { name: 'Remitly', code: 'REMITLY' },
];

async function main() {
  console.log('Seeding transfer companies...');
  for (const company of COMPANIES) {
    await prisma.transferCompany.upsert({
      where: { code: company.code },
      update: { name: company.name },
      create: company,
    });
  }
  console.log(`✓ ${COMPANIES.length} companies seeded`);

  // Demo organization
  const passwordHash = await bcrypt.hash('demo123456', 12);
  const slug = 'demo-store';

  const org = await prisma.organization.upsert({
    where: { slug },
    update: {},
    create: {
      name: 'Demo Money Transfer Store',
      slug,
      email: 'demo@example.com',
      phone: '555-123-4567',
      address: '123 Main St',
      city: 'Houston',
      state: 'TX',
      zip: '77001',
      subscriptionStatus: 'TRIAL',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`✓ Demo organization: ${org.name}`);

  const location = await prisma.location.upsert({
    where: { id: 'demo-location' },
    update: {},
    create: {
      id: 'demo-location',
      name: 'Main Branch',
      address: '123 Main St',
      city: 'Houston',
      state: 'TX',
      zip: '77001',
      organizationId: org.id,
    },
  });
  console.log(`✓ Demo location: ${location.name}`);

  const owner = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      name: 'Demo Owner',
      email: 'demo@example.com',
      passwordHash,
      role: 'OWNER',
      organizationId: org.id,
      locationId: location.id,
    },
  });
  console.log(`✓ Demo user: ${owner.email} / demo123456`);

  // Demo customer
  await prisma.customer.upsert({
    where: { id: 'demo-customer-1' },
    update: {},
    create: {
      id: 'demo-customer-1',
      firstName: 'Maria',
      lastName: 'Garcia',
      phone: '713-555-0001',
      address: '456 Oak St',
      city: 'Houston',
      state: 'TX',
      zip: '77002',
      idType: 'MATRICULA',
      idNumber: 'MAT123456',
      organizationId: org.id,
    },
  });
  console.log('✓ Demo customer seeded');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
