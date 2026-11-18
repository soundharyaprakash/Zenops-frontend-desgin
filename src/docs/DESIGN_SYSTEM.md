# ZenOps CMDB Design System & Architectural Guide

## 1. Executive Summary & Design Philosophy
The ZenOps Configuration Management Database (CMDB) module is engineered specifically for **mid-size companies, modern technology enterprises, and fast-scaling startups**. Unlike heavy, monolithic legacy ITSM products (e.g. ServiceNow, BMC Remedy) that overwhelm operators with clunky tables and convoluted workflows, ZenOps delivers:
- **Atlassian / Jira-inspired visual language**: Dense, scannable, flat, fast, and keyboard-accessible.
- **Guided Simplicity**: Intelligent defaults, plain-English concepts ("What it measures" and "Why it matters"), and inline guidance.
- **Enterprise Multi-Tenancy**: Complete tenant isolation across three organizations (`ZenDev Software Technologies`, `Choose My Career`, and `SpaceZen LLC`) with zero cross-tenant leakage.
- **Universal Theme Engine**: Seamless Light and Dark mode pairing with ZenOps brand gradient accents (`#1F6BFF` Blue &rarr; `#19C8F0` Cyan &rarr; `#3EF2B5` Mint).

---

## 2. Design Tokens & Color Palette

### 2.1 CSS Variables & Semantic Mapping
Tokens are defined in `app/globals.css` using CSS custom properties mapped in `tailwind.config.ts`, ensuring zero flash on theme switch and full persistence via `next-themes`.

| Token Role | Light Mode (matches white logo bg) | Dark Mode (matches deep navy logo bg) | Jira Reference / Intent |
| :--- | :--- | :--- | :--- |
| `--bg-app` | `#F7F8F9` | `#060A14` | Neutral background canvas |
| `--surface` | `#FFFFFF` | `#0C1220` | Flat card container background |
| `--raised` | `#FFFFFF` (shadow-xs) | `#121A2B` | Elevated panels & dropdowns |
| `--sunken` | `#F1F2F4` | `#080D18` | Inset backgrounds, table headers |
| `--border` | `#DCDFE4` | `#1E2A40` | Subtle 1px borders |
| `--border-strong` | `#B7B9BE` | `#2C3B57` | Active borders & dividers |
| `--text-default` | `#0B1220` | `#E6EDF7` | High contrast primary text |
| `--text-secondary`| `#44546F` | `#9FB0C8` | Subdued metadata text |
| `--text-muted` | `#758195` | `#6F819D` | Micro labels, dates, icons |
| `--primary` | `#0C66E4` (hover `#0055CC`) | `#579DFF` (hover `#85B8FF`) | Jira primary blue |
| `--selected-bg` | `#E9F2FF` | `#12294A` | Row & tab selection background |

### 2.2 Semantic Status & Feedback Colors
Status colors share identical color hues across both modes with tinted contrast backgrounds:
- **Success / Green**: `#1F845A` (Light) / `#4BCE97` (Dark) &bull; Operational CIs, SLA healthy, Certified.
- **Warning / Amber**: `#B38600` (Light) / `#F5CD47` (Dark) &bull; Stale telemetry, degraded health, pending reviews.
- **Danger / Red**: `#C9372C` (Light) / `#F87168` (Dark) &bull; Trust score &lt; 60, critical incidents, missing owners.
- **Info / Blue**: `#0C66E4` (Light) / `#579DFF` (Dark) &bull; Active campaigns, standard changes.
- **Discovery / Purple**: `#6E5DC6` (Light) / `#9F8FEF` (Dark) &bull; Reconciled IRE attributes, automated feeder tags.

### 2.3 Brand Gradient Accent
Brand gradient: `linear-gradient(135deg, #1F6BFF 0%, #19C8F0 50%, #3EF2B5 100%)`.
Used **sparingly** to maintain enterprise utility:
- Vector infinity logo mark (`public/brand/zenops-mark.svg`).
- Getting Started setup progress bar (`ProgressBar variant="brand"`).
- Active Trust Score Ring radial highlights (`TrustScoreRing`).
- Top banner border highlights.

---

## 3. Typography & Micro-Interactions

### 3.1 Type Hierarchy
- **Base UI**: Inter (`14px` regular body, `13px` form labels, `12px` table cells, `11px` uppercase tracking headers).
- **Technical & Identity**: Geist Mono (`11px` and `12px` for CI IDs, MAC addresses, IPv4/v6, serial numbers, FQDNs, and JSON payloads).
- **Tabular Figures**: Numeric metrics, counts, and financial values utilize `tabular-nums` to eliminate layout jitter during live updates.

### 3.2 Jira Lozenges & Badges
All status badges conform to Atlassian Jira issue specifications:
- Small uppercase bold text (`10px` or `11px`, `tracking-wider`).
- `3px` border radius.
- Tinted background with subtle border (never color-only for WCAG AA compliance).

### 3.3 Atomic Component Library (`components/ui/*`)
- **`Lozenge.tsx` / `Badge.tsx`**: Standard Jira-style status lozenges with specialized domain variants (`OperationalBadge`, `CriticalityBadge`, `TrustScoreBadge`).
- **`Button.tsx`**: 3px radius button suite with `primary`, `secondary`, `subtle`, `outline`, `danger`, and `link` appearances.
- **`Card.tsx`**: 8px border radius, 1px border, flat surface with subtle elevation on hover.
- **`InlineEdit.tsx`**: Click-to-edit field component with instant `Enter` to commit, `Escape` to cancel, and automated audit logging.
- **`TrustScoreRing.tsx`**: Radial SVG gauge displaying 0-100 composite health with a click-to-open 5-pillar breakdown popover.
- **`InfoHint.tsx`**: Plain-English concept popover answering "What it measures" and "Why it matters" with explicit SLA targets.
- **`ProgressBar.tsx`**: Jira and brand-gradient progress indicators.
- **`Drawer.tsx` & `Modal.tsx`**: Accessible overlays with Escape-to-close and focus preservation.

---

## 4. Multi-Tenant Isolation Architecture
Multi-tenancy is guaranteed at the service abstraction layer (`services/cmdb-service.ts`):
1. **Header Workspace Selector**: Switching tenants (`ZenDev Software Technologies`, `Choose My Career`, `SpaceZen LLC`) dynamically switches data contexts.
2. **Strict Data Scoping**: Every CI retrieval, search query, dependency map edge, data quality task, and audit record is strictly filtered by `company_id` and `sys_domain`.
3. **Visual Isolation Indicator**: Every screen displays the tenant badge with a lock icon: `"Data isolated to this tenant"`.
4. **Zero Cross-Tenant Leakage**: CIs, relationships, and audit history belonging to one tenant are completely invisible to other tenants.

---

## 5. Accessibility & Performance Verification
- **Contrast Ratios**: Verified &ge; 4.5:1 for standard text and &ge; 3:1 for large headers and status lozenges in both Light and Dark themes.
- **Focus Rings**: 2px solid primary ring (`focus-visible:ring-2 focus-visible:ring-primary`) across all interactive inputs.
- **Zero Heavy External Dependencies**: Built natively using React 18, Next.js 14 App Router, Tailwind CSS, Lucide icons, and `next-themes`.
