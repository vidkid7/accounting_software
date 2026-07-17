# Accounting System

Web-Based Billing, Inventory & Accounting Management System.

## Structure

```
accounting_system/
├── apps/
│   ├── web/          # React + Vite frontend
│   └── api/          # NestJS backend
├── libs/
│   └── shared-types/ # Shared TypeScript contracts
├── guide/            # Documentation (requirement, architecture, rules, phases, design)
├── infra/            # Docker / nginx / terraform
└── scripts/          # backup.sh etc.
```

## Quick Start

```bash
# 1. Start infra (postgres, redis, minio)
npm run docker:up

# 2. Install deps
npm install

# 3. Run DB migrations
npm run prisma:migrate

# 4. Start backend + frontend
npm run dev:api
npm run dev:web
```

See `guide/` for full specs.
