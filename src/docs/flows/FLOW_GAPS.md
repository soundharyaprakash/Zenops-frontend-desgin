# Technical Debt, Implementation Gaps & 30-Second Flow Summaries (`FLOW_GAPS.md`)

---

## 1. Executive Gap Analysis & Technical Debt (Ranked by Priority)

| Rank & Severity | Identified Gap | Real-World Impact | Code Evidence | Recommended Production Fix |
| :---: | :--- | :--- | :--- | :--- |
| **1. HIGH** | **Missing 50,000 CI Dataset Source** | `data/source/CMDB_50k_CIs_Sampling.xlsx` is absent on disk. Active inventory has 21 CIs. High-volume virtual scrolling was **not measured** with live 50k rows. | [seed-from-xlsx.ts#L18](file:///d:/zenops/scripts/seed-from-xlsx.ts#L18) | Supply raw 50k XLSX or run synthetic 50k generator and benchmark `@tanstack/react-virtual`. |
| **2. HIGH** | **Simulated Discovery Daemon** | Discovery scan runs via a client-side 1800ms timer and random counter increments rather than executing live AWS STS API calls. | [cmdb-context.tsx#L880](file:///d:/zenops/context/cmdb-context.tsx#L880) | Wire a Python/Celery or Go Temporal worker executing real AWS CloudTrail and Azure Graph queries. |
| **3. HIGH** | **Client-Side Persistence & Storage Limits** | State persists in browser `localStorage` keyed per tenant (`zenops_cmdb_cis_...`). Large datasets will hit the 5MB browser storage quota. | [cmdb-context.tsx#L210](file:///d:/zenops/context/cmdb-context.tsx#L210) | Connect `services/cmdb-service.ts` to PostgreSQL with Prisma ORM and Row-Level Security. |
| **4. MEDIUM**| **Simulated OTP Delivery** | 6-digit OTP verification uses pre-canned `123456` code and console output rather than delivering live transactional emails. | [auth-service.ts#L295](file:///d:/zenops/services/auth-service.ts#L295) | Integrate AWS SES or SendGrid API in `AuthService.requestPasswordReset()`. |
| **5. MEDIUM**| **Disabled Social SSO Providers** | "Continue with Google" and "Continue with Microsoft" are disabled with "Coming Soon" badges. | [LoginForm.tsx#L180](file:///d:/zenops/components/auth/LoginForm.tsx#L180) | Configure NextAuth.js or WorkOS for enterprise SAML / Google OAuth2. |
| **6. MEDIUM**| **Unconfigured ESLint** | Running `npm run lint` prompts interactively because `.eslintrc.json` is not yet committed to the repo. | [package.json#L9](file:///d:/zenops/package.json#L9) | Commit `.eslintrc.json` with `next/core-web-vitals` preset. |
| **7. LOW** | **Hardcoded Rule Order in IRE** | Precedence order (MAC &rarr; Serial &rarr; Name+Class) is hardcoded in `cmdb-service.ts` rather than drag-and-drop editable in the UI. | [cmdb-service.ts#L210](file:///d:/zenops/services/cmdb-service.ts#L210) | Store rule priority in database with drag-and-drop reordering UI in `/reconciliation-rules`. |
| **8. LOW** | **Fixed Class Hierarchy** | Schema inheritance tree is fixed to the 9 standard classes; creating custom child classes from the UI is not yet built. | [ClassHierarchyView.tsx#L38](file:///d:/zenops/components/cmdb/settings/ClassHierarchyView.tsx#L38) | Build dynamic schema editor allowing admins to append custom JSON attributes. |

---

## 2. 30-Second Flow Summaries (Tanglish Quick-Revision Cards)

### Module 01: Authentication & Access
> "Visitor login illama vandha Next.js middleware intercept panni `/login?next=...`-ku redirect pannum. 5 thappana password potta 15-minute automatic lockout with live countdown. 2-step register panni 6-digit OTP potta account verify aagum. Seed accounts (Sarah Admin, David Owner, Priya Editor, Alex Viewer) 1-click-la fill pannalaam. Cookie `zenops_session` create aagi tenant isolate aaidum."

### Module 02: Getting Started & Setup
> "Pudhu company signup panna udaney, manuals theva-illama 6-step guided checklist load aagum. Connectors, CI ingestion, rules, ownership, topology, and attestation. Live system data inspect panni step mudinja udaney brand gradient (#1F6BFF to #3EF2B5) progress bar advance aagum. Dashboard-la compact banner-ah irukum, vendam-na 1-click dismiss pannikalam."

### Module 03: CMDB Health Dashboard
> "Leadership-ku single pane of glass view. Top 5 KPI tiles: Total CIs (21), Avg Trust Score (85%), Stale CIs (19%), Missing Owner (10%), Duplicate Suspects (1). InfoHint click panna plain-English targets kedaikum. 'More Metrics' click panna operational split and completeness theriyum. Single click-la complete catalog Excel-compatible CSV-ah download aagum."

### Module 04: CI Inventory Table
> "High-density Atlassian table with 12px cells and Geist Mono IDs. Top-la 5 saved filter tabs: 'All CIs', 'My CIs', 'Missing Owner', 'Stale', and 'Production Tier 0'. IP, MAC, serial number search instantaneous. Multiple rows select panna floating action bar slide-up aagi bulk owner reassignment and CSV export pannalaam."

### Module 05: Create & Edit CI
> "Pudhu CI register panra form. Class select panna ServiceNow-compatible inheritance tree kaatum (`cmdb_ci > cmdb_ci_hardware > cmdb_ci_server`). **Rule #1**: Live CI-ku Owner and Support Group illana, Trust Score instant-ah -30 points drop aagi red warning banner kaatum and Data Quality task raise pannidum. Automatic point-of-entry governance."

### Module 06: CI 360 Deep Profile
> "Jira-style 2-column profile (`/cis/[id]`). Radial Trust Score gauge click panna 5-pillar mathematical breakdown reveal aagum. Inline edit panna audit trail instant-ah save aagum. 6 tabs: Specs, Topology with blast radius, Related ITSM (`INC-1042` P1), and Financial costs. **Rule #2**: Production CI retire panna mandatory Change Record `CHG-...` keka safeguard modal open aagum."

### Module 07: Relationships & Topology
> "5-Tier directed dependency graph (Tier 0 Business Services down to Tier 4 Network). Dual mode switch: **Upstream** (Change Impact: enna break aagum) vs **Downstream** (Root Cause: edhu fault). Node click panna slide-in drawer open aagi blast radius score (Severe 82%) and Payments API-oda **$85,000/hr downtime exposure** calculate panni kaatum!"

### Module 08: Business Services
> "Technical assets-ah business context kooda map panra catalog. 5 core services: Payments API ($85k/hr), Customer Web Portal ($42k/hr), etc. Service Trust Score underlying infrastructure dependencies-oda weighted roll-up. Score < 70% aana red SLA breach border alert kaatum with direct link to topology map."

### Module 09: Discovery Sources
> "Cloud (AWS, Azure) and Agent (Dynatrace, CrowdStrike) connectors management. Engeyum plain-text passwords illa; ellam `vault://secret/...` HashiCorp Vault URI dhaan. AWS connector pakkathula 'Trigger Manual Scan' click panna status 'In Progress' aagi, 1.8 seconds-la +12 CIs sync aaidum with execution history drawer."

### Module 10: Raw Staging Pipeline
> "Discovery connectors direct-ah production CMDB-la write aaga koodadhu; adhaan indha buffer queue. Ingested payloads New, Matched, and Processed status-la irukum. 'View JSON' eye icon click panna raw AWS JSON payload inspect pannalaam. 'Process All' click panna IRE engine batch evaluate panni master CMDB-ku promote pannum."

### Module 11: Reconciliation (IRE)
> "Duplicates thadukura identification engine. 4-tier rule order: Rule 1 MAC (98% confidence) &rarr; Rule 2 Serial (94%) &rarr; Rule 3 Name+Class (88%) &rarr; Rule 4 Fallback Create. Attribute conflict irundha source authority weights moolama winner determine aagum (SolarWinds beats AWS for IP). Datadog webhook simulator live incident correlation prove pannum."

### Module 12: Automated Data Quality
> "CMDB rot prevent panra remediation engine. 5 anomaly tabs: Missing Owner, Stale, Duplicates, Conflicts, Orphans. Anomaly task-la 'Score Diff: +30 pts' green badge irukum. **'Apply Fix'** button click panna single click-la owner mutate aagi Trust Score degraded 45%-la irundhu **86% healthy SLA-ku instant-ah restore aaidum**."

### Module 13: Attestation Campaigns
> "Quarterly compliance and SOX audit verification. Campaign open panni target CIs inspect pannalaam. Owner **'Certify Live'** click panna lastVerified timestamp update aagum; **'Flag Stale'** click panna decommissioning trigger aagum. Completion 100% reach aana campaign automatically 'Completed' aaidum."

### Module 14: Immutable Audit Trail
> "Tamper-evident, append-only forensic event log. Ovvoru create, inline edit, retire, and attestation action-um actor, timestamp, before/after diffs, and Change Record ID-oda store aagum. Inga edit or delete button-e kedayadhu. 'Export JSON' click panni complete audit trail download pannikalam."

### Module 15: Platform Settings & Schema
> "Enterprise admin command center. ServiceNow-compatible class hierarchy tree browser. Trust Score weight sliders: Freshness (30), Completeness (25), Consistency (20), Relationships (15), Ownership (10) exact-ah 100% sum aaganum with live worked math calculation. And granular RBAC matrix comparing all 4 roles."
