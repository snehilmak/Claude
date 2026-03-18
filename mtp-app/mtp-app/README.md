# TransferPro — Money Transfer Agency Platform

A SaaS platform for businesses that process in-person money transfers through companies like Intermex, Vigo, Ria, Barri, Maxi, MoneyGram, ViaAmericas, and more.

## Features

- **Transaction Tracking** — Log and monitor transfers across all MTO companies
- **Customer Management** — Full sender database with ID verification and compliance flags
- **Multi-Company Support** — Intermex, Vigo, Ria, Barri, Maxi, MoneyGram, ViaAmericas, Western Union, Sigue, Dolex, and more
- **Compliance & Reporting** — CTR alerts ($1,000+ daily aggregate), daily summaries, audit trail
- **Multi-tenant** — Each organization (store) is fully isolated
- **Role-based access** — Owner, Manager, Agent roles
- **Subscription billing** — $49/location/month via Stripe (14-day free trial)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL + Prisma ORM v7
- **Auth**: Custom session-based (bcrypt + httpOnly cookies)
- **Payments**: Stripe
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Getting Started

### 1. Clone & Install

```bash
cd mtp-app
npm install
```

### 2. Configure Environment

Copy `.env` and fill in your values:

```
DATABASE_URL="postgresql://user:password@localhost:5432/mtp_db"
NEXTAUTH_SECRET="your-secret-here"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID="price_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

### 3. Set Up Database

```bash
# Run migrations
npx prisma migrate dev --name init

# Seed demo data (companies + demo account)
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Demo login**: `demo@example.com` / `demo123456`

## Project Structure

```
src/
  app/
    (auth)/          # Login, register, logout
    api/             # REST API routes
      auth/          # Login, register endpoints
      customers/     # Customer CRUD
      transactions/  # Transaction CRUD
      companies/     # Company list
      stripe/        # Webhook handler
    dashboard/       # Protected dashboard pages
      transactions/  # List + new transfer form
      customers/     # List + new customer form
      companies/     # Company configuration
      reports/       # Compliance & summary reports
  components/ui/     # Reusable UI components
  lib/
    auth.ts          # Session management
    db.ts            # Prisma singleton
    utils.ts         # Helpers
  middleware.ts      # Route protection
prisma/
  schema.prisma      # Database schema
  seed.ts            # Seed script
```

## Subscription Model

- **$49/location/month** — flat fee per business location
- 14-day free trial, no credit card required
- Stripe handles billing, webhooks update subscription status in DB

## Compliance Features

- CTR alerts: flags customers with cumulative sends ≥ $1,000/day
- SAR tracking field on transactions
- Full audit trail (agent, timestamp, amounts)
- ID verification storage per customer
- Customer blocking with reason

## Desktop Mode

The web app can be wrapped with Electron for offline-capable desktop use. A separate Electron wrapper can be added to `/electron/` directory pointing to the Next.js server.
