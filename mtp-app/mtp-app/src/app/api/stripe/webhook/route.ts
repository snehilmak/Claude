import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' });

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const subscription = event.data.object as Stripe.Subscription;
  const customer = event.data.object as Stripe.Customer;

  switch (event.type) {
    case 'checkout.session.completed': {
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      const orgEmail = session.customer_email ?? session.metadata?.orgEmail;
      if (orgEmail) {
        await prisma.organization.updateMany({
          where: { email: orgEmail },
          data: {
            stripeCustomerId: customerId,
            subscriptionId,
            subscriptionStatus: 'ACTIVE',
            trialEndsAt: null,
          },
        });
      }
      break;
    }
    case 'customer.subscription.updated': {
      const stripeCustomerId = subscription.customer as string;
      let status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'PAUSED' = 'ACTIVE';
      if (subscription.status === 'past_due') status = 'PAST_DUE';
      else if (subscription.status === 'canceled') status = 'CANCELED';
      else if (subscription.status === 'paused') status = 'PAUSED';
      await prisma.organization.updateMany({
        where: { stripeCustomerId },
        data: { subscriptionStatus: status },
      });
      break;
    }
    case 'customer.subscription.deleted': {
      const stripeCustomerId = subscription.customer as string;
      await prisma.organization.updateMany({
        where: { stripeCustomerId },
        data: { subscriptionStatus: 'CANCELED' },
      });
      break;
    }
    case 'customer.deleted': {
      const stripeCustomerId = customer.id;
      await prisma.organization.updateMany({
        where: { stripeCustomerId },
        data: { subscriptionStatus: 'CANCELED' },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
