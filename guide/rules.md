# Project Rules & Constraints
## Web-Based Billing, Inventory & Accounting Management System

**Version:** 1.0
**Date:** July 16, 2026
**Companion to:** `requirement.md`, `architecture.md`

> These rules are **mandatory** for all human developers and AI agents working in this codebase. Violations must be flagged in code review.

---

## 1. What To Do (Mandatory)

### 1.1 Code & Architecture
- Use **TypeScript** everywhere (frontend + backend) — no `any` in committed code.
- Wrap every financial mutation (sale, purchase, payment, stock adjustment) in a **single DB transaction**.
- Use the shared `libs/shared-types` contracts between frontend and backend.
- Keep business logic in **NestJS services**, not controllers.
- Log every mutation to `AuditLog` via the global interceptor.
- Validate all inputs with **class-validator DTOs** at the controller boundary.
- Use **Prisma migrations** for all schema changes — never edit the DB directly in production.
- Write a unit/integration test for every service method that touches money or stock.

### 1.2 Security
- Hash passwords with **bcrypt** (cost ≥ 12).
- Issue short-lived JWT access tokens (≤ 15 min) + refresh tokens (≤ 7 days, rotated).
- Enforce **RBAC** with `@Roles()` + `RolesGuard` on every protected route.
- Use **HTTPS/TLS** for all traffic; reject plain HTTP.
- Encrypt sensitive fields (tax IDs, bank details) at rest.
- Enable 2FA (TOTP) for Admin/Super Admin roles.

### 1.3 Data Integrity
- Never **hard-delete** a posted financial entry — use reversal/cancellation (offsetting journal).
- Trial balance must always tally (debits = credits) after every transaction.
- Stock quantity on dashboard must equal the sum of `StockLedger` for that product.

### 1.4 Error Handling
- Return structured errors: `{ error: { code, message, details? } }`.
- Use NestJS exception filters (HTTP 400/401/403/404/409/422/500).
- Log full stack traces server-side; show safe messages to clients.
- Use **BullMQ** for retries on async jobs (email/SMS/report generation).

### 1.5 AI Agent Boundaries
- AI may **read** code, generate code, run tests, and propose migrations.
- AI must **never** execute destructive DB commands (`DROP`, `DELETE` without WHERE, `TRUNCATE`) unless wrapped in a reviewed migration.
- AI must **never** commit secrets, tokens, or `.env` files.
- AI must **never** disable security guards (RBAC, auth) to "make tests pass."
- AI changes require a passing build + tests before being marked complete.

---

## 2. What To Avoid (Prohibited)

### 2.1 Libraries / Dependencies (Do NOT use)
| Avoid | Reason | Use instead |
|---|---|---|
| `mongoose` / MongoDB | No ACID transactions across modules | **PostgreSQL + Prisma** |
| Plain `console.log` for audit | Not persistent/searchable | **AuditLog + structured logger** |
| `eval` / `new Function` | Code injection risk | typed functions |
| Unmaintained packages (< 1yr no update) | Security debt | vetted alternative |
| Client-side money math (`float`) | Rounding errors | **Decimal (Prisma `Decimal` / `decimal.js`)** |
| `axios` (optional) | Heavier than needed | **native `fetch`** or `@nestjs/axios` |
| Hardcoded config | Env leakage | **ConfigModule + `.env` (gitignored)** |

### 2.2 Coding Anti-Patterns
- No business logic inside React components or NestJS controllers.
- No SQL string concatenation (use Prisma parameterized queries) — prevents SQL injection.
- No storing passwords or secrets in code, logs, or client storage.
- No `any` type, no `ts-ignore` without a documented reason.
- No skipping tests to meet deadlines.
- No partial updates: a sale must update stock **and** ledger together or roll back.

### 2.3 Network & Infrastructure
- No open database ports to the public internet (DB behind VPC/private subnet).
- No disabled CORS / `*` allowed origins in production.
- No plaintext credentials in connection strings committed to repo.
- No self-signed certs in production (use ACM / trusted CA).
- No unthrottled public endpoints — apply rate limiting (`@nestjs/throttler`).

### 2.4 Security Violations (Hard Stop)
- Never log full credit card / bank account numbers.
- Never return raw DB errors to the client (leaks schema).
- Never bypass authentication for "internal" routes.
- Never store JWT secret in source code.
- Never allow unauthenticated file upload to S3 public bucket.

---

## 3. Boundaries & Limits

### 3.1 AI Agent Operating Boundaries
- **Allowed:** read files, edit source, run tests/lint/build, create migrations, propose PRs.
- **Not allowed:** deploy to production, drop DB, change IAM/cloud credentials, merge without review, access external paid APIs with real keys.
- **Required approval:** schema-breaking migrations, dependency additions, security config changes, cloud infra changes.

### 3.2 Transaction Boundaries
- One HTTP request = one business transaction (stock + ledger + invoice atomic).
- Cross-module consistency enforced by DB constraints, not app logic alone.

### 3.3 Module Boundaries
- Frontend never talks to DB directly — only via API.
- Services may call other modules only through their public service interfaces (no cross-module DB access).
- `audit` and `tax` are cross-cutting — injected, not duplicated.

### 3.4 Environment Boundaries
- `.env.development` / `.env.production` separated; production secrets via secret manager (not files).
- Local dev may use MinIO + local Postgres; production uses managed services.

---

## 4. Network Security Checklist

- [ ] All traffic over HTTPS/TLS 1.2+
- [ ] API behind Nginx/ALB with rate limiting
- [ ] CORS restricted to known origins
- [ ] DB not publicly reachable
- [ ] S3 buckets private + signed URLs only
- [ ] JWT secret from secret manager
- [ ] Security headers: HSTS, CSP, X-Frame-Options, X-Content-Type-Options
- [ ] Daily encrypted backups + point-in-time recovery tested
- [ ] 2FA enforced for privileged roles
- [ ] Input validation on every endpoint (class-validator)
- [ ] Dependency scanning in CI (e.g., `npm audit` / Snyk)

---

## 5. Review Gate (before merge)

A PR is **blocked** if any of these are true:
1. Build or tests fail.
2. A financial mutation is not wrapped in a transaction.
3. A new dependency is in the "Avoid" list (§2.1).
4. RBAC guard missing on a protected route.
5. Secrets or `.env` committed.
6. Audit log not written for a mutation.
7. AI agent disabled a security control.

---

*End of Document*
