# saasguard

> **Private / Internal project** — not publicly released.

A self-hosted SaaS management and shadow IT detection platform built for IT Operations teams. SaaSGuard connects to your identity providers and card feeds to give you full visibility into every SaaS tool in use across your organization — including the ones nobody approved.

## What it does

- **Shadow IT Discovery** — Automatically discovers unauthorized apps via OAuth permission grants from Microsoft 365 (Microsoft Graph API) and Google Workspace. Surfaces apps by risk score and user count.
- **App Lifecycle Management** — Review queue lets admins approve, deny, or mark apps as managed. Status flows: `shadow → review → managed / denied`.
- **Access Tracking** — Maps every user-to-app grant (OAuth, SSO, manual). Flags stale access (90+ days inactive) and offboarding risk (users with active app access who have gone quiet).
- **Spend Intelligence** — Ingests SaaS spend from Brex, Ramp, Stripe, or CSV upload. Matches transactions to known apps. Shows monthly spend by app and department.
- **License Management** — Track seats purchased vs. seats used and cost-per-seat per app.
- **Automated Alerts** — Generates alerts for new shadow apps, offboarding risk, high spend anomalies, stale access, and connector errors.
- **Connector Framework** — Pluggable connectors with encrypted credential storage and BullMQ-based background sync workers (cron-scheduled). Connectors: Microsoft 365, Google Workspace, Okta, 1Password.
- **Team & Role Management** — Multi-tenant teams with invite-based onboarding. Roles: `admin`, `finance`, `manager`. Managers see scoped views filtered to their department.

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.4 |
| UI | React | 19.2.4 |
| Language | TypeScript | ^5 |
| Database ORM | Prisma | ^7.7.0 |
| Database | PostgreSQL | — |
| Auth | NextAuth v5 (beta) + Prisma Adapter | ^5.0.0-beta.31 |
| Background Jobs | BullMQ + ioredis | ^5.75.2 |
| Identity Connectors | Microsoft Graph (@azure/identity) | ^4.13.1 |
| Google Connector | googleapis | ^171.4.0 |
| Charts | Recharts | ^3.8.1 |
| Forms | react-hook-form + zod | ^7 / ^4 |
| Styling | Tailwind CSS v4 | ^4 |
| Component Primitives | shadcn/ui, Radix UI, Base UI | — |
| Testing | Vitest + Testing Library | ^4 |
| Deployment | Railway | — |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Redis instance (for BullMQ job queues)

### Environment Variables

Create a `.env` file:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/saasguard"

# Auth (NextAuth v5)
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_URL="http://localhost:3000"

# Microsoft 365 connector (per-tenant via UI, stored encrypted)
# AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET
# — configured through the Connectors UI, not env vars

# Google Workspace connector
# — configured through the Connectors UI, not env vars

# Redis (for BullMQ workers)
REDIS_URL="redis://localhost:6379"

# Email (for invite emails)
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM=""
```

### Setup

```bash
npm install
npx prisma migrate deploy
npm run dev
```

To run the background sync worker (separate process):

```bash
npm run worker
```

### First Login

On first boot, create an admin user via the invite system or seed the database directly. The first user with `admin` role can invite others.

## Project Structure

```
app/(dashboard)/      # Next.js App Router pages
  dashboard/          # Summary stats, recent shadow IT, top spend
  discovery/          # Shadow app review queue
  inventory/          # Full managed app catalog
  access/             # User-to-app grants, offboarding risk, stale access
  spend/              # Spend analytics and CSV upload
  connectors/         # Connector configuration and sync status
  settings/           # Profile settings
  admin/              # User, team, and invite management
app/api/              # REST API route handlers
lib/connectors/       # M365, Google, Okta, 1Password connector logic
worker/               # BullMQ job workers (one per connector)
prisma/               # Database schema and migrations
__tests__/            # Vitest unit tests
```

## Running Tests

```bash
npm test
```

