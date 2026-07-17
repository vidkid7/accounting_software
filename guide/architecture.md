# Architecture & Design Document
## Web-Based Billing, Inventory & Accounting Management System

**Version:** 1.0
**Date:** July 16, 2026
**Companion to:** `requirement.md`

---

## 1. Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | **React 18 + TypeScript** with **Vite** | Fast builds, large ecosystem, strong typing for financial data |
| UI Library | **Tailwind CSS + shadcn/ui** (Radix) | Responsive, accessible, minimal training needed |
| State Mgmt | **TanStack Query** (server state) + **Zustand** (client state) | Clean data fetching + lightweight global state |
| Backend | **Node.js + NestJS (TypeScript)** | Modular, DI, built-in validation pipes, RBAC guards |
| ORM | **Prisma** | Type-safe, migrations, multi-DB support |
| Database | **PostgreSQL 15** | ACID transactions for atomic stock + ledger updates |
| Auth | **JWT (access + refresh)** + **Passport** (Google SSO), **2FA** via `otplib` | Secure, stateless, extensible |
| File Storage | **AWS S3** (or MinIO for self-host) | Invoices, receipts, attachments |
| Reporting | **Puppeteer** (PDF) + **ExcelJS** (XLSX/CSV) | Server-side document generation |
| Realtime | **WebSockets (Socket.IO)** | Dashboard live updates, in-app notifications |
| Queue | **BullMQ + Redis** | Async jobs (emails, SMS, bulk reports) |
| Hosting | **Docker + AWS ECS/Fargate** (or any k8s) | Horizontal scaling |
| CI/CD | **GitHub Actions** | Build, test, deploy |

> Stack is adjustable per team preference (see `requirement.md` §6). The above is the recommended default.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                       │
│   React SPA  ──  Tailwind/shadcn UI  ──  TanStack Query       │
└───────────────┬───────────────────────────┬─────────────────┘
                │  HTTPS (TLS)               │  WSS
                ▼                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway / Nginx                         │
│            (Rate limit, TLS termination, static serve)         │
└───────────────┬───────────────────────────────────────────────┘
                ▼
┌─────────────────────────────────────────────────────────────┐
│                  NestJS Backend (Stateless)                    │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ Auth    │ │ Inventory│ │ Billing  │ │ Accounting       │   │
│  │ Module  │ │ Module  │ │ Module   │ │ Module           │   │
│  └─────────┘ └─────────┘ └──────────┘ └──────────────────┘   │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ Reports │ │ Notif.  │ │ RBAC     │ │ Audit/Logging    │   │
│  │ Module  │ │ Module  │ │ Guard    │ │ Middleware       │   │
│  └─────────┘ └─────────┘ └──────────┘ └──────────────────┘   │
└───────┬───────────────┬───────────────────┬──────────────────┘
        ▼               ▼                   ▼
┌────────────┐  ┌──────────────┐   ┌────────────────────┐
│ PostgreSQL │  │    Redis     │   │  BullMQ Workers     │
│ (Primary)  │  │ (Cache/Queue)│   │ (Email/SMS/Reports) │
└────────────┘  └──────────────┘   └────────────────────┘
        │                                     │
        ▼                                     ▼
┌────────────────────┐              ┌──────────────────────┐
│  S3 (Attachments)  │              │ External Integrations│
│  Backups (Daily)   │              │ Stripe/Razorpay, SMS, │
└────────────────────┘              │ GSTN/IRD, Bank Feeds  │
                                    └──────────────────────┘
```

---

## 3. Core Design Principles

1. **Atomic Transactions** — Every sale/purchase runs inside a single DB transaction: stock ledger update + journal entry + invoice persist succeed or fail together (req §4 Data Integrity).
2. **Immutable Audit Trail** — Posted financial entries are never hard-deleted; reversals/cancellations create offsetting entries (req §4 Auditability).
3. **Single Source of Truth** — One central PostgreSQL DB shared by inventory, billing, and accounting modules.
4. **RBAC Everywhere** — Guards at controller level enforce role permissions (req FR1.2).
5. **Event-Driven Side Effects** — Domain events (InvoiceCreated, LowStock) trigger notifications via queue, decoupled from request path.

---

## 4. Application Flow (Key Workflows)

### 4.1 Sales Invoice Flow (atomic)
```
Sales Staff → Create Invoice (line items, tax, discount)
      │
      ▼
Validate stock availability (per warehouse)
      │
      ▼
BEGIN TRANSACTION
  ├─ Insert Invoice + line items (status: CONFIRMED)
  ├─ Decrement Stock Ledger (type: SALE_OUT)
  ├─ Create Journal Entry (Debtor Dr / Sales Cr / Tax Payable Cr)
  └─ Insert Customer ledger entry (outstanding +)
COMMIT
      │
      ▼
Emit "InvoiceCreated" event →
  ├─ Generate PDF (Puppeteer)
  ├─ Send email/in-app notification (FR7.1/FR7.2)
  └─ Update dashboard cache (WebSocket push)
```
*Acceptance: stock reduced AND journal created together, or whole txn rolls back (req §8).*

### 4.2 Purchase Bill Flow
```
Store Staff → GRN (goods receipt) → Purchase Bill
      │
      ▼
BEGIN TRANSACTION
  ├─ Insert Bill + line items
  ├─ Increment Stock Ledger (type: PURCHASE_IN)
  ├─ Journal Entry (Purchase Dr / Vendor Cr / Input Tax Dr)
  └─ Vendor ledger (payable +)
COMMIT → emit "PurchasePosted" → notifications
```

### 4.3 Stock Transfer Flow
```
Store Staff → Transfer (from WH-A → WH-B)
      │
      ▼
BEGIN TRANSACTION
  ├─ Stock Ledger OUT (WH-A)
  └─ Stock Ledger IN (WH-B)
COMMIT
```

### 4.4 Authentication Flow
```
User → POST /auth/login (email+password)
      │
      ▼
Verify bcrypt hash → issue JWT access (15m) + refresh (7d)
      │
      ▼
Each request → AuthGuard validates JWT → RBAC guard checks role
      │
      ▼
2FA (if enabled) → TOTP challenge before session active
```

### 4.5 Reporting Flow
```
User → GET /reports/pnl?from=&to=
      │
      ▼
Service aggregates from Journal Entries (always balanced)
      │
      ▼
Render → JSON (UI) / PDF (Puppeteer) / XLSX (ExcelJS)
```

---

## 5. Folder & File Structure

```
accounting_system/
├── docker-compose.yml
├── package.json
├── README.md
├── requirement.md
├── architecture.md
│
├── apps/
│   ├── web/                      # React frontend
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── routes/           # React Router pages
│   │       │   ├── auth/         # Login, Register, Reset, TwoFactor
│   │       │   ├── dashboard/    # Real-time dashboard
│   │       │   ├── inventory/    # Products, Warehouses, Stock, Transfers
│   │       │   ├── sales/        # Quotations, Invoices, Returns, Customers
│   │       │   ├── purchase/     # PO, GRN, Bills, Vendors
│   │       │   ├── accounting/   # CoA, Ledger, JV, Reports, Bank
│   │       │   ├── reports/      # All report pages
│   │       │   └── settings/     # Company, Users, Tax, Roles
│   │       ├── components/       # Shared UI (shadcn-based)
│   │       ├── hooks/            # TanStack Query hooks
│   │       ├── store/            # Zustand stores
│   │       ├── lib/              # api client, utils
│   │       └── types/            # TS types shared w/ backend
│   │
│   └── api/                      # NestJS backend
│       ├── package.json
│       ├── nest-cli.json
│       ├── prisma/
│       │   ├── schema.prisma     # DB models
│       │   ├── migrations/
│       │   └── seed.ts
│       └── src/
│           ├── main.ts
│           ├── app.module.ts
│           ├── common/           # guards, decorators, filters, interceptors
│           │   ├── guards/       # JwtAuthGuard, RolesGuard
│           │   ├── decorators/   # @Roles, @CurrentUser
│           │   └── filters/      # AllExceptionsFilter
│           ├── config/           # env config (ConfigModule)
│           ├── modules/
│           │   ├── auth/         # login, register, 2fa, sso, rbac
│           │   ├── users/        # user & role management
│           │   ├── company/      # org profile, fiscal year
│           │   ├── inventory/    # products, warehouses, stock, transfers
│           │   ├── sales/        # quotations, invoices, returns, customers
│           │   ├── purchase/     # PO, GRN, bills, vendors
│           │   ├── accounting/   # coa, journal, ledger, reports, bank
│           │   ├── tax/          # tax config & calculations
│           │   ├── reports/      # dashboard + report generators
│           │   ├── notifications/# email/sms/whatsapp + in-app
│           │   └── audit/        # audit log middleware
│           └── jobs/             # BullMQ workers
│
├── libs/
│   └── shared-types/             # Shared TS interfaces (contracts)
│
├── infra/
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   ├── nginx.conf
│   └── terraform/                # optional IaC
│
└── scripts/
    └── backup.sh                 # daily DB backup
```

---

## 6. Database Schema (Prisma — key models)

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String
  role      Role     @default(SALES_STAFF)
  status    Status   @default(ACTIVE)
  twoFactorSecret String?
  companyId String
  createdAt DateTime @default(now())
}

model Company {
  id          String @id @default(uuid())
  name        String
  logoUrl     String?
  address     String
  taxId       String
  fiscalYearStart DateTime
  baseCurrency String @default("USD")
}

model Product {
  id          String @id @default(uuid())
  sku         String @unique
  barcode     String?
  name        String
  categoryId  String
  unit        String
  taxCode     String
  reorderLevel Int  @default(0)
  costPrice   Decimal
  salePrice   Decimal
  valuation   ValuationMethod @default(WEIGHTED_AVG)
}

model Warehouse { id String @id @default(uuid()) name String companyId String }

model StockLedger {
  id        String @id @default(uuid())
  productId String
  warehouseId String
  quantity  Decimal          // +in / -out
  type      TxType           // SALE_OUT, PURCHASE_IN, TRANSFER, ADJUST
  reference String           // invoice/bill id
  createdAt DateTime @default(now())
}

model Customer {
  id String @id @default(uuid())
  name String
  taxId String?
  creditTerms Int @default(0)
  openingBalance Decimal @default(0)
}

model Invoice {
  id String @id @default(uuid())
  number String @unique
  customerId String
  status InvoiceStatus @default(DRAFT)
  subtotal Decimal
  tax Decimal
  discount Decimal
  total Decimal
  lineItems InvoiceLineItem[]
  journalEntry JournalEntry?
}

model JournalEntry {
  id String @id @default(uuid())
  date DateTime
  reference String
  lines JournalLine[]
  isPosted Boolean @default(true)
}

model JournalLine {
  id String @id @default(uuid())
  accountId String
  debit Decimal @default(0)
  credit Decimal @default(0)
}

model Account {           // Chart of Accounts
  id String @id @default(uuid())
  code String
  name String
  type AccountType       // ASSET, LIABILITY, EQUITY, INCOME, EXPENSE
}

model AuditLog {
  id String @id @default(uuid())
  userId String
  action String
  entity String
  entityId String
  before Json?
  after Json?
  createdAt DateTime @default(now())
}
```

---

## 7. API Structure (NestJS controllers)

| Module | Endpoints (sample) |
|---|---|
| Auth | `POST /auth/login`, `/auth/register`, `/auth/refresh`, `/auth/2fa/enable`, `/auth/sso/google` |
| Users | `GET/POST/PUT /users`, `POST /users/:id/role` |
| Inventory | `CRUD /products`, `/warehouses`, `POST /stock/adjust`, `POST /stock/transfer` |
| Sales | `CRUD /quotations`, `/invoices`, `POST /invoices/:id/confirm`, `/credit-notes`, `/customers` |
| Purchase | `CRUD /purchase-orders`, `/grn`, `/bills`, `/vendors` |
| Accounting | `GET /accounts`, `POST /journal`, `GET /reports/trial-balance`, `/pnl`, `/balance-sheet`, `/ar-aging`, `/ap-aging`, `/bank/reconcile` |
| Reports | `GET /dashboard/summary`, `GET /reports/export?fmt=pdf|xlsx` |
| Tax | `GET/PUT /tax/config`, `POST /tax/calculate` |
| Notifications | `GET /notifications`, `POST /notifications/mark-read` |

All mutating endpoints wrapped in transactions via a custom `TransactionalInterceptor`.

---

## 8. Security & Non-Functional Mapping

| Req (§4) | Implementation |
|---|---|
| Encryption in transit | Nginx TLS + HTTPS only |
| Encryption at rest | PostgreSQL + S3 SSE; bcrypt password hashing |
| RBAC | `RolesGuard` + `@Roles()` decorator |
| Auditability | `AuditLog` written by global interceptor on all mutations |
| Atomicity | DB transactions per business operation |
| Backups | `scripts/backup.sh` daily + managed DB snapshots |
| Availability | Multi-instance ECS + health checks + ALB |
| Usability | Tailwind responsive layout, mobile-first |

---

## 9. Phased Build Mapping

| Phase | Deliverables in this architecture |
|---|---|
| **Phase 1 (MVP)** | `auth`, `users`, `company`, `inventory` (basic), `sales` (invoice), `purchase` (bill), `accounting` (ledger, P&L, balance sheet), `reports` (basic) |
| **Phase 2** | Multi-warehouse, batch/expiry, `tax` filing reports, `bank` reconciliation, recurring billing |
| **Phase 3** | Multi-currency, multi-branch, `sales/pos`, fixed assets, integrations (`payments`, `e-invoicing`) |

---

*End of Document*
