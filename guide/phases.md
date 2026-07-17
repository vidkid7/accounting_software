# Phased Delivery Plan
## Web-Based Billing, Inventory & Accounting Management System

**Version:** 1.0
**Date:** July 16, 2026
**Companion to:** `requirement.md`, `architecture.md`, `rules.md`

> Each phase lists: scope, modules, key features (mapped to FR IDs), deliverables, and exit criteria. Phases are sequential; Phase N must meet exit criteria before Phase N+1 starts.

---

## Phase 0 — Foundation & Scaffolding

**Goal:** Working monorepo, CI, DB, and auth skeleton.

### Scope
- Monorepo setup (`apps/web`, `apps/api`, `libs/shared-types`, `infra`).
- PostgreSQL + Prisma schema (core entities from `requirement.md` §5).
- NestJS app skeleton with `ConfigModule`, global filters, `TransactionalInterceptor`.
- React app skeleton with routing + Tailwind/shadcn.
- Docker Compose for local dev (Postgres, Redis, MinIO).
- GitHub Actions CI (lint, build, test).

### Deliverables
- Repo builds and runs locally via `docker-compose up`.
- `prisma migrate dev` creates all base tables.
- Health check endpoint `/health` returns 200.
- CI green on empty scaffold.

### Exit Criteria
- [ ] App boots locally end-to-end
- [ ] DB migrations apply cleanly
- [ ] CI pipeline runs on every PR

---

## Phase 1 — MVP (Core Business Loop)

**Goal:** A business can sell, buy, track stock, and see basic financials.

### Modules
`auth`, `users`, `company`, `inventory` (basic), `sales` (invoice), `purchase` (bill), `accounting` (ledger, P&L, balance sheet), `reports` (basic).

### Key Features (FR mapping)
| Area | Features |
|---|---|
| Access (FR1) | FR1.1 login/register, FR1.2 RBAC, FR1.3 audit log, FR1.5 company profile |
| Inventory (FR2) | FR2.1 products (SKU, barcode, category, unit, tax code), FR2.3 real-time stock, FR2.4 stock-in/out |
| Sales (FR3) | FR3.1 quotation→invoice, FR3.2 tax invoice + auto tax, FR3.3 PDF/print, FR3.4 partial payments, FR3.6 sales returns |
| Purchase (FR4) | FR4.1 PO/GRN/bill, FR4.2 vendor master, FR4.3 purchase returns, FR4.4 payables |
| Accounting (FR5) | FR5.1 Chart of Accounts, FR5.2 auto journal, FR5.3 manual JV, FR5.4 GL/TB/P&L/Balance Sheet, FR5.11 year close |
| Reports (FR6) | FR6.1 dashboard, FR6.4 export, FR6.5 date filters |

### Deliverables
- Full sales loop: invoice confirm → stock out + journal (atomic, req §8).
- Full purchase loop: GRN → stock in + journal (atomic).
- Trial balance always tallies.
- Basic dashboard + P&L + Balance Sheet.

### Exit Criteria
- [ ] Sale reduces stock AND posts journal together (verified)
- [ ] Trial balance tallies after every seeded transaction
- [ ] Dashboard stock = sum of StockLedger
- [ ] RBAC enforced on all routes
- [ ] Audit log written for every mutation

---

## Phase 2 — Operational Depth

**Goal:** Multi-location, tax compliance, reconciliation, recurring revenue.

### Modules
`inventory` (advanced), `tax`, `accounting/bank`, `sales/recurring`, `notifications`.

### Key Features (FR mapping)
| Area | Features |
|---|---|
| Inventory (FR2) | FR2.2 variants + unit conversion, FR2.5 low-stock alerts, FR2.6 batch/expiry, FR2.7 barcode/QR, FR2.8 adjustments + approval, FR2.9 stock-take, FR2.10 FIFO/LIFO/WAC |
| Tax (FR5.7) | GST/VAT summary, input/output tax reports, configurable per region |
| Accounting (FR5) | FR5.5 AR/AP aging, FR5.6 bank deposits/withdrawals/reconciliation, FR5.8 expenses + receipts |
| Sales (FR3) | FR3.7 recurring/subscription billing |
| Notifications (FR7) | FR7.1 email/SMS/WhatsApp, FR7.2 in-app center |
| Reports (FR6) | FR6.2 inventory reports, FR6.3 sales reports |

### Deliverables
- Multi-warehouse with transfers and batch/expiry tracking.
- Tax filing-ready reports.
- Bank reconciliation UI + engine.
- Recurring billing engine (BullMQ scheduled jobs).
- Notification service (email + in-app; SMS/WhatsApp adapter-ready).

### Exit Criteria
- [ ] Stock transfer moves qty between warehouses atomically
- [ ] Tax reports reconcile to ledgers
- [ ] Bank reconciliation matches statements to entries
- [ ] Recurring invoices auto-generate on schedule
- [ ] Low-stock alert fires via notification

---

## Phase 3 — Scale, Channels & Integrations

**Goal:** Multi-entity, retail POS, assets, and external ecosystem.

### Modules
`accounting/multicurrency`, `accounting/assets`, `sales/pos`, `integrations/*`.

### Key Features (FR mapping)
| Area | Features |
|---|---|
| Accounting (FR5) | FR5.9 fixed asset register + depreciation, FR5.10 multi-currency + FX rates, multi-branch consolidation |
| Sales (FR3) | FR3.8 POS mode (walk-in/retail) |
| Integrations (FR8) | FR8.1 payment gateways (Stripe/Razorpay/PayPal), FR8.2 bank feed import (CSV/OFX), FR8.3 e-invoicing (GSTN/IRD), FR8.4 export to Tally/QuickBooks |
| Reports (FR6) | Consolidated multi-branch reports |

### Deliverables
- POS UI (fast barcode scan, offline-tolerant draft mode).
- Multi-currency ledger with FX revaluation.
- Fixed asset module with depreciation schedules.
- Payment gateway + bank feed + e-invoicing adapters.
- Third-party export connectors.

### Exit Criteria
- [ ] POS sale posts same atomic flow as web invoice
- [ ] Multi-currency trial balance tallies in base currency
- [ ] Asset depreciation posts correct journal
- [ ] At least one payment gateway processes a live test payment
- [ ] E-invoice submitted to sandbox tax portal

---

## Cross-Phase Non-Functional Track (always on)

Applied continuously, not a separate phase:
- Security: TLS, RBAC, 2FA, encryption at rest (req §4).
- Performance: 2–3s page loads, horizontal scaling (req §4).
- Backup: daily encrypted backups + tested restore (req §4).
- Compliance: local tax + data-protection adherence (req §4).
- AI rules: enforced via `rules.md` review gate on every PR.

---

## Milestone Summary

| Phase | Theme | Primary Risk |
|---|---|---|
| 0 | Scaffold + CI | Environment setup drift |
| 1 | Core loop MVP | Atomicity of stock+ledger |
| 2 | Depth + tax + recon | Tax rule complexity |
| 3 | Scale + POS + integrations | External API reliability |

---

*End of Document*
