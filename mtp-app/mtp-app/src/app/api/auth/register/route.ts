import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, createSession } from '@/lib/auth';
import { generateSlug } from '@/lib/utils';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { orgName, name, email, password } = body as {
      orgName: string;
      name: string;
      email: string;
      password: string;
    };

    if (!orgName || !name || !email || !password) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      );
    }

    // Generate a unique slug for the org
    let baseSlug = generateSlug(orgName);
    let slug = baseSlug;
    let attempt = 0;
    while (await prisma.organization.findUnique({ where: { slug } })) {
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    const passwordHash = await hashPassword(password);

    // Create org + owner user in a transaction
    const { user } = await prisma.$transaction(async (tx) => {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      const org = await tx.organization.create({
        data: {
          name: orgName.trim(),
          slug,
          email: normalizedEmail,
          trialEndsAt,
        },
      });

      const location = await tx.location.create({
        data: {
          name: 'Main Location',
          organizationId: org.id,
        },
      });

      const newUser = await tx.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          role: 'OWNER',
          organizationId: org.id,
          locationId: location.id,
        },
      });

      return { user: newUser, organization: org };
    });

    await createSession(user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[auth/register]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
