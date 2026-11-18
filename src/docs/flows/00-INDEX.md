# ZenOps CMDB: Complete Module & Architecture Flow Index
**Author**: Senior Business Analyst & Principal Tech Lead  
**Repository**: `d:\zenops` (Next.js 14 App Router, TypeScript, Tailwind CSS)  
**Target Audience**: Managers, Tech Leads, Engineering Teams, Auditors, and Onboarding Developers  

---

## 1. How to Read These Flow Documents

These documents represent the **authoritative, ground-truth flow documentation** of every single capability in the ZenOps Configuration Management Database (CMDB) platform. Every flow describes **HOW** the system works from beginning to end:
1. **User Action**: Exactly what the human operator clicks, types, or triggers.
2. **System Behavior**: What the React component, Next.js Middleware, context dispatchers, and `services/*` abstraction layer execute under the hood.
3. **Data State Changes**: What records are created, updated, or deleted in memory, `localStorage`, session cookies, or backend persistence.
4. **Governance Rules Fired**: Which compliance checks, ownership rules, blast-radius calculations, or trust algorithms evaluate.
5. **Where the Flow Goes Next**: The downstream destination, UI transition, toast alert, or cross-module ripple effect.

### Status Tag Definitions
- **`[Implemented]`**: Fully functional in active code and runnable directly in the UI. Evidence is linked to actual source files and functions.
- **`[Mock/Simulated]`**: Fully operational in the UI and state management, but utilizes client-side simulation, in-memory stubs, or pre-canned payloads instead of a live external daemon/gateway.
- **`[Planned]`**: Architected in the design or interface contracts, but marked as disabled, deferred, or awaiting third-party enterprise providers (e.g., enterprise SSO providers).

---

## 2. Master Module Directory

| # | Module Name | Route Path | Primary Owner Role | Status Tags | Specification File |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **01** | **Authentication & Access Management** | `/login`, `/register`, `/verify-otp`, `/forgot-password`, `/reset-password`, `/accept-invite`, `/logout` | All Roles / Security Admin | `[Implemented]` / `[Mock/Simulated]` (OTP/SSO) | [01-auth-and-access.md](file:///d:/zenops/docs/flows/01-auth-and-access.md) |
| **02** | **Getting Started & Setup Onboarding** | `/getting-started`, `/dashboard` | Tenant Admin / CMDB Owner | `[Implemented]` | [02-getting-started-and-onboarding.md](file:///d:/zenops/docs/flows/02-getting-started-and-onboarding.md) |
| **03** | **Executive CMDB Health Dashboard** | `/dashboard` | Executive / All Roles | `[Implemented]` | [03-dashboard.md](file:///d:/zenops/docs/flows/03-dashboard.md) |
| **04** | **Configuration Items (CI) Inventory** | `/cis` | All Roles (RBAC-limited) | `[Implemented]` / `[Mock/Simulated]` (50k) | [04-ci-inventory.md](file:///d:/zenops/docs/flows/04-ci-inventory.md) |
| **05** | **CI Creation & Attribute Editing** | `/cis/new`, `/cis/[id]/edit` | Editor / CMDB Owner / Admin | `[Implemented]` | [05-create-and-edit-ci.md](file:///d:/zenops/docs/flows/05-create-and-edit-ci.md) |
| **06** | **Jira-Style CI 360 Deep Profile** | `/cis/[id]` | All Roles (RBAC-limited) | `[Implemented]` | [06-ci-360-detail.md](file:///d:/zenops/docs/flows/06-ci-360-detail.md) |
| **07** | **5-Tier Dependency Topology & Impact**| `/relationships` | ITSM Agent / Change Manager | `[Implemented]` | [07-relationships-and-impact.md](file:///d:/zenops/docs/flows/07-relationships-and-impact.md) |
| **08** | **Business Services & Financial Risk** | `/services` | IT Leadership / Service Owner | `[Implemented]` | [08-business-services.md](file:///d:/zenops/docs/flows/08-business-services.md) |
| **09** | **Automated Discovery Connectors** | `/discovery-sources` | Platform Ops / Admin | `[Implemented]` / `[Mock/Simulated]` (Scan) | [09-discovery.md](file:///d:/zenops/docs/flows/09-discovery.md) |
| **10** | **Raw Discovery Staging Pipeline** | `/staging` | CMDB Owner / Discovery Eng | `[Implemented]` | [10-staging.md](file:///d:/zenops/docs/flows/10-staging.md) |
| **11** | **Identification & Reconciliation (IRE)**| `/ire-console`, `/reconciliation-rules` | CMDB Owner / System Architect | `[Implemented]` / `[Mock/Simulated]` (Engine) | [11-reconciliation-and-ire.md](file:///d:/zenops/docs/flows/11-reconciliation-and-ire.md) |
| **12** | **Automated Data Quality & Remediation**| `/data-quality` | CMDB Owner / CI Owner | `[Implemented]` / `[Mock/Simulated]` (Sweep) | [12-data-quality.md](file:///d:/zenops/docs/flows/12-data-quality.md) |
| **13** | **Governance Attestation Campaigns** | `/attestation-campaigns` | Compliance Auditor / CI Owner | `[Implemented]` | [13-attestation.md](file:///d:/zenops/docs/flows/13-attestation.md) |
| **14** | **Tamper-Evident Immutable Audit Log**| `/audit-history` | Auditor / Platform Admin | `[Implemented]` | [14-audit-history.md](file:///d:/zenops/docs/flows/14-audit-history.md) |
| **15** | **Platform Settings & Schema Designer**| `/settings/classes`, `/settings/roles`, `/settings/trust-score` | Enterprise Admin | `[Implemented]` | [15-settings.md](file:///d:/zenops/docs/flows/15-settings.md) |

---

## 3. Cross-Module Architecture & Deep Dives

| Document | Purpose & Scope | Link |
| :--- | :--- | :--- |
| **90-END-TO-END-FLOWS.md** | Complete end-to-end user journeys: First-time setup, Ingestion Pipeline, Datadog Alert Incident Triage, Production Change Risk & Blast Radius, CI Decommissioning, Stale CI Lifecycle, Duplicate Resolution, Attestation, and Multi-Tenant Isolation. | [90-END-TO-END-FLOWS.md](file:///d:/zenops/docs/flows/90-END-TO-END-FLOWS.md) |
| **91-STATE-MACHINES-AND-RULES.md** | Formal state machines and transition matrices for CI Lifecycles, Operational States, Data Quality Tasks, Staging Records, Attestation Cycles, and Master Business Rules Table. | [91-STATE-MACHINES-AND-RULES.md](file:///d:/zenops/docs/flows/91-STATE-MACHINES-AND-RULES.md) |
| **92-DATA-FLOW-AND-ROLES.md** | Granular RBAC Permissions Matrix, End-to-End Data Lifecycle flow diagram, Service Function Catalog with TypeScript signatures, and Real Backend Transition Roadmap. | [92-DATA-FLOW-AND-ROLES.md](file:///d:/zenops/docs/flows/92-DATA-FLOW-AND-ROLES.md) |
| **FLOW_GAPS.md** | Technical debt, implementation gaps vs product blueprints, and 30-second Tanglish executive summary cards for review prep. | [FLOW_GAPS.md](file:///d:/zenops/docs/flows/FLOW_GAPS.md) |
