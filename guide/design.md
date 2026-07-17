# Design System & UI Guidelines
## Web-Based Billing, Inventory & Accounting Management System

**Version:** 1.0
**Date:** July 16, 2026
**Companion to:** `requirement.md`, `architecture.md`, `rules.md`, `phases.md`

> This document defines the visual language: color, typography, spacing, components, and accessibility. It aligns with `architecture.md` (Tailwind CSS + shadcn/ui) and `requirement.md` §4 (Usability, Localization).

---

## 1. Design Principles

1. **Clarity over decoration** — financial data must be legible, not pretty.
2. **Density with breathing room** — tables are information-dense but use consistent spacing.
3. **Consistent affordances** — buttons, inputs, and states behave the same everywhere.
4. **Trust via restraint** — neutral base, single brand accent, semantic colors only for status.
5. **Responsive first** — desktop primary, tablet usable, mobile readable (no feature loss).

---

## 2. Color Theme

### 2.1 Brand & Base Palette (Light Mode)
| Token | Hex | Usage |
|---|---|---|
| `--background` | `#FFFFFF` | App background |
| `--surface` | `#F8FAFC` | Cards, panels, tables |
| `--surface-muted` | `#F1F5F9` | Hover, disabled bg |
| `--border` | `#E2E8F0` | Dividers, input borders |
| `--foreground` | `#0F172A` | Primary text |
| `--foreground-muted` | `#64748B` | Secondary text, labels |
| `--brand` | `#2563EB` | Primary actions, links, active nav |
| `--brand-hover` | `#1D4ED8` | Button hover |
| `--brand-soft` | `#EFF6FF` | Brand tint backgrounds |

### 2.2 Semantic Colors (Status)
| Token | Hex | Meaning |
|---|---|---|
| `--success` | `#16A34A` | Paid, in-stock, confirmed |
| `--success-soft` | `#DCFCE7` | Success badge bg |
| `--warning` | `#D97706` | Low stock, due soon |
| `--warning-soft` | `#FEF3C7` | Warning badge bg |
| `--danger` | `#DC2626` | Overdue, out-of-stock, delete |
| `--danger-soft` | `#FEE2E2` | Danger badge bg |
| `--info` | `#0891B2` | Info, neutral notice |
| `--info-soft` | `#CFFAFE` | Info badge bg |

### 2.3 Dark Mode (optional, Phase 2)
| Token | Hex |
|---|---|
| `--background` | `#0B1120` |
| `--surface` | `#111827` |
| `--border` | `#1F2937` |
| `--foreground` | `#F8FAFC` |
| `--foreground-muted` | `#94A3B8` |
| `--brand` | `#3B82F6` |

> Toggle via `class="dark"` on `<html>`; Tailwind `darkMode: 'class'`.

### 2.4 Color Rules
- Never use color alone to convey meaning (pair with icon/text — accessibility).
- Brand color used for **primary** actions only; avoid coloring everything.
- Maintain ≥ 4.5:1 contrast for text (WCAG AA).

---

## 3. Typography

### 3.1 Font Families
| Role | Font | Fallback |
|---|---|---|
| Primary (UI + body) | **Inter** | `system-ui, -apple-system, sans-serif` |
| Numbers / Financial | **Roboto Mono** (or `tabular-nums` Inter) | `ui-monospace, monospace` |
| Headings | **Inter** (semibold/bold) | same as primary |

> Load via Google Fonts or self-host (avoid layout shift). Numbers MUST use tabular figures for column alignment.

### 3.2 Type Scale
| Style | Size | Weight | Line-height | Usage |
|---|---|---|---|---|
| Display | 30px | 700 | 1.2 | Page titles |
| H1 | 24px | 700 | 1.25 | Section headers |
| H2 | 20px | 600 | 1.3 | Card titles |
| H3 | 16px | 600 | 1.4 | Sub-sections |
| Body | 14px | 400 | 1.5 | Default text |
| Small | 12px | 500 | 1.4 | Labels, captions |
| Micro | 11px | 500 | 1.3 | Table meta, badges |

### 3.3 Number Formatting
- Currency: locale-aware (`Intl.NumberFormat`), e.g. `₹ 1,23,456.00` / `$ 1,234.56`.
- Right-align all numeric columns; use `font-variant-numeric: tabular-nums`.
- Negative amounts in `--danger` with `-` prefix (never parentheses only).

---

## 4. Spacing & Layout

### 4.1 Spacing Scale (4px base)
`--space-1: 4px` · `2: 8px` · `3: 12px` · `4: 16px` · `6: 24px` · `8: 32px` · `12: 48px`

### 4.2 Layout Grid
- Max content width: **1280px** centered, with 24px gutters.
- Sidebar: fixed **240px** (collapsible to 64px on tablet).
- Topbar: 56px height with search + notifications + user menu.
- Data tables: full-width cards with sticky header.

### 4.3 Border Radius
| Element | Radius |
|---|---|
| Buttons / inputs | 8px |
| Cards / modals | 12px |
| Avatars / badges | 9999px (pill) |

### 4.4 Elevation
- Cards: `shadow-sm` (subtle), modals: `shadow-lg`.
- Avoid heavy shadows; rely on borders for structure.

---

## 5. Component Standards (shadcn/ui based)

| Component | Rules |
|---|---|
| Button | Variants: `primary` (brand), `secondary` (surface), `ghost`, `danger`. Min height 36px. Loading state required on async actions. |
| Input / Select | 36px height, `--border` default, focus ring = brand. Labels above, helper text below. |
| Table | Sticky header, zebra rows optional, hover highlight, sortable columns, row actions on hover. |
| Badge | Semantic soft bg + colored text (success/warning/danger/info/neutral). |
| Modal / Dialog | Centered, 12px radius, backdrop blur, ESC + click-outside to close, focus trap. |
| Toast | Bottom-right, auto-dismiss 4s, success/error/info variants. |
| Tabs | Underline style, active = brand. |
| Date Range Picker | Used on all reports (FR6.5). |
| Empty State | Icon + message + primary CTA. |
| Skeleton | Shimmer placeholder during loading (no spinners in tables). |

---

## 6. Iconography
- Library: **lucide-react** (consistent stroke, 24px grid, 1.5px stroke).
- Icons paired with text for actions (no icon-only buttons without tooltip).
- Status uses: `CheckCircle` (success), `AlertTriangle` (warning), `XCircle` (danger), `Info` (info).

---

## 7. Accessibility (WCAG AA)
- Keyboard navigable: all interactive elements focusable, visible focus ring.
- Color + icon + text for every status (never color alone).
- Form inputs have associated `<label>`.
- Minimum touch target: 36px (mobile).
- Respect `prefers-reduced-motion` (disable non-essential animation).
- Sufficient contrast (≥ 4.5:1 text, ≥ 3:1 large text/UI).

---

## 8. Localization & Theming Hooks
- All strings via i18n keys (not hardcoded) — supports multiple languages (req §4 Localization).
- Currency, date, number formats from `Company.baseCurrency` + locale setting.
- Theme tokens in CSS variables so white-label branding (logo, brand color) is configurable per company (FR1.5).

---

## 9. Mockup References (suggested screens)
1. **Login** — centered card, brand logo, SSO buttons, 2FA step.
2. **Dashboard** — KPI cards (sales, receivables, low stock, cash), charts, recent transactions.
3. **Invoice Create** — customer select, line-item table (auto tax), totals, PDF preview.
4. **Inventory List** — searchable table, stock badges, low-stock highlight.
5. **Ledger / Trial Balance** — debit/credit columns, tally indicator.
6. **Reports** — date-range filter, export buttons (PDF/Excel).

---

*End of Document*
