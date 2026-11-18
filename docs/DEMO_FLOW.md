# ZenOps CMDB: Manager & Stakeholder Demonstration Script

## Executive Pitch
> *"Traditional CMDBs like ServiceNow and Remedy are bloated, slow, and require dedicated administrative teams. ZenOps delivers an Atlassian/Jira-inspired, modern CMDB designed for mid-size companies and fast-scaling startups: simple, guided, blazing fast, with automated discovery, continuous trust scoring, and real-time topology impact analysis."*

---

## Step-by-Step Demonstration Walkthrough

### Step 1: CMDB Health Dashboard (`/dashboard`)
1. **Navigate to `/dashboard`**:
   - Point out the clean **Jira-style flat layout**, typography (`Inter` for headers, `Geist Mono` for technical IDs), and the ZenOps brand logo.
   - Show the **Theme Toggle** (top right) by clicking between **Light Mode** (crisp white background) and **Dark Mode** (deep navy background) with zero flash.
2. **Getting Started Checklist**:
   - Show the 6-step guided progress banner at the top with the brand-gradient progress bar (Blue &rarr; Cyan &rarr; Mint).
   - Explain how this guides startup teams from day 1 without consulting manuals.
3. **5 Primary KPI Tiles (Row 1)**:
   - Walk through: **Total CIs** (100% target), **Avg Trust Score** (80%+ target), **Stale CIs** (&lt;5% target), **Missing Owner** (&lt;5% target), and **Duplicate Suspects** (0 target).
   - Hover over the small **InfoHint (`i`)** on any tile to show the plain-English explanation answering **"What it measures"** and **"Why it matters"**.
   - Click **"More Metrics"** to reveal secondary enterprise metrics (Operational CIs, Non-Operational CIs, Attestation Completion %, and Completeness Score).
4. **Quality & Architectural Spread (Row 2)**:
   - **Trust Score Distribution**: Point out the 5 health bands (80-100 Optimal, 60-79 Adequate, and bands below 60 marked in danger red with **"Needs Attention"**).
   - **CIs by Class**: Horizontal bars across Servers, Containers, Cloud, Applications, Databases, Networks, and SaaS.
5. **Remediation Priorities (Row 3)**:
   - **Open Data Quality Remediation**: Click any category to jump directly to filtered tasks.
   - **Discovery Sources Health**: Point out the `OK`, `LATE`, and `FAILED` lozenges. Click the refresh button on AWS or Kubernetes to trigger a live manual scan.
   - **Services by Trust Score**: Point out that **Payments API** is healthy (94), while **Legacy HR System** (42) has an alert for breaching the 70% critical SLA threshold.

---

### Step 2: Enterprise Multi-Tenancy & Data Isolation
1. **Header Tenant Switcher**:
   - In the top header bar, point out the active organization: **`ZenDev Software Technologies`** with the lock icon **`"Data isolated to this tenant"`**.
   - Click the dropdown and switch to **`Choose My Career`** or **`SpaceZen LLC`**.
   - Notice that the entire inventory, metrics, topology, and audit logs immediately update to reflect only that tenant's records.
   - Emphasize to your manager: **Zero data leakage between enterprise clients or subsidiaries.**
   - Switch back to `ZenDev Software Technologies` to continue the demo.

---

### Step 3: High-Density Virtualized CI Inventory (`/cis`)
1. **Navigate to `/cis`**:
   - Demonstrate the dense table with 12px cells, Geist Mono IDs (`CI-000492`), and Jira lozenges.
2. **Saved Filter Tabs**:
   - Click through the tabs: **`All CIs`**, **`My CIs`**, **`Missing Owner`**, **`Stale`**, and **`Production Tier 0`**. Notice how instantaneous the filtering is.
3. **Column Chooser**:
   - Click the **`Columns`** button on the right to toggle any of the 11 columns on or off (e.g. toggle IP Address, Support Group, or Last Discovered).
4. **Bulk Actions**:
   - Select 2 or 3 rows using the checkboxes.
   - Point out the floating action bar: **`Assign Owner`**, **`Send to Review`**, **`Retire`**, **`CSV`**, and **`JSON`**.
   - Click **`Assign Owner`**, select "Database Administration (DBA)", and click Save. Show how all selected CIs update immediately with audit entries.
5. **Bulk CSV Import**:
   - Click **`Import CSV`** in the top header.
   - Show the drag-and-drop file uploader and text paste tab with downloadable sample template (`zenops_cmdb_ci_template.csv`).

---

### Step 4: CI Creation & Governance Rule Enforcement (`/cis/new`)
1. **Click `+ Create CI`**:
   - Notice the **Live Trust Score Preview Gauge** in the header.
2. **Demonstrate Rule 1 (Live CI needs Owner & Support Group)**:
   - Type a name: `prod-auth-broker-01`.
   - Set Operational Status to **`Operational`**.
   - Set Owner to **`Unassigned`**.
   - Point out the immediate **Live Trust Score drop (-30 pts)** and the danger warning banner:
     *"Operational/In-Use CIs must have a designated Owner and Support Group. Leaving them unassigned drops the Trust Score by 30 points and automatically opens a Data Quality task."*
   - Re-assign an owner (e.g. "Platform Reliability Engineering"). Watch the score immediately bounce back to healthy 90%!
3. **Point out the 7 Structured Sections**:
   - Identity (with dynamic class inheritance breadcrumb: `cmdb_ci > cmdb_ci_hardware > cmdb_ci_server`), Ownership & Support, Identification Keys, Class Specifications, Asset & Financial (Cost, PO Number, Warranty), and Compliance (SOC2, PCI-DSS).

---

### Step 5: Jira-Style CI 360 Deep Profile (`/cis/[id]`)
1. **Navigate to `/cis/CI-000492` (`PROD-DB-MUMBAI-01`)**:
   - Point out the **Jira Issue 2-Column Layout**: wide technical tabs on the left, **"Details"** side panel on the right.
2. **Inline Editing**:
   - Click on the CI Name or Description. Type a change, press `Enter`. Show that it saves instantly and logs an event in the **Audit Trail** tab.
3. **Trust Score Radial Gauge**:
   - Click on the Trust Score ring to open the **5-Pillar Breakdown Popover**:
     Freshness (30%), Completeness (25%), Consistency (20%), Relationships (15%), Ownership (10%).
4. **Browse the 6 Tabs**:
   - **Technical Specs**: CPU, RAM, Disk, OS kernel, and runtime attributes.
   - **Dependency Topology**: Upstream parents, downstream children, and blast radius risk level (`High`, Score `82/100`).
   - **Related ITSM**: Active linked records with Jira priority lozenges:
     - `INC-1042` (P1 - Critical, In Triage)
     - `PRB-0089` (P2 - Major)
     - `CHG-2001` (P3 - Normal, CAB Approved)
     - `REQ-5512` (P4 - Low)
   - **Asset & Financial**: Acquisition cost ($1,200), PO Number, Cost Center, Warranty date, and 1-click link to Vendor Portal.
   - **IRE Reconciliation**: Matching rules applied and winning source authority.
   - **Audit Trail**: Full chronological before/after change diffs with timestamps and actor names.
5. **Demonstrate Rule 2 (Retirement CAB Check)**:
   - Click the red **`Retire CI`** button.
   - Show that retiring a Production CI strictly requires a **Change Record ID (`CHG-...`)** and displays the dependent nodes and blast radius risk!

---

### Step 6: 5-Tier Directed Dependency Topology (`/relationships`)
1. **Navigate to `/relationships`**:
   - Show the interactive graph canvas displaying the **5 Architectural Tiers**:
     - **Tier 0**: Business Services (Payments API, Customer Portal, Order Processing)
     - **Tier 1**: Applications & Microservices
     - **Tier 2**: Compute Nodes & Containers (Pods, VMs)
     - **Tier 3**: Databases & Storage (PostgreSQL Ledger, Redis Cache)
     - **Tier 4**: Network & Cloud Infrastructure (Edge VPC, Palo Alto Firewall)
2. **Mode Switcher**:
   - Switch between **`Upstream (Change Impact)`** (*"What will break if this node changes?"*) and **`Downstream (Root Cause)`** (*"What could be the root cause of an incident?"*).
3. **Ranked Business Service Risk List (Right Panel)**:
   - Point out the downtime revenue exposure per hour:
     - **Payments API**: `$85,000/hr`
     - **Customer Web Portal**: `$42,000/hr`
     - **Order Processing**: `$28,000/hr`
4. **Node Inspection Drawer**:
   - Click on any node. The drawer slides in from the right. Click **`Attach to Change`** to demonstrate cross-module ITSM linkage.

---

### Step 7: Raw Discovery Staging & IRE Simulator (`/staging` & `/ire-console`)
1. **Navigate to `/staging`**:
   - Explain the visual ingestion strip: **`Connectors`** &rarr; **`Raw Staging`** &rarr; **`IRE Engine`** &rarr; **`CMDB Master`** &rarr; **`Consumers`**.
   - Show the staged payloads table. Click **`View JSON`** to inspect the raw incoming discovery payload.
2. **Navigate to `/ire-console`**:
   - Click **`Load AWS EC2`**. Show the raw JSON payload in the editor.
   - Click **`Run Simulation`**:
     - Watch the simulator step through the identification rules:
       - **Rule 1**: Exact MAC Address Match (98% confidence)
       - **Rule 2**: Serial Number Hardware Match (94% confidence)
       - **Rule 3**: Composite Name + Class Match (88% confidence)
     - Point out the **Attribute Winners Table** where source weights determine winning values (e.g. AWS 90 vs SCCM 80).
3. **Datadog Alert Webhook Demo**:
   - Click **`Fire Datadog Alert Webhook`** to simulate an automated observability incident triggering live CI correlation.

---

### Step 8: Automated Data Quality Remediations (`/data-quality`)
1. **Navigate to `/data-quality`**:
   - Point out the 5 category tabs: **`All Tasks`**, **`Stale Telemetry`**, **`Missing Owner`**, **`Duplicate Suspects`**, **`Conflicting Data`**, and **`Orphan CIs`**.
2. **Apply Remediation with Live Trust Score Diff**:
   - Find a pending task. Point out the green badge: **`Score Diff: +30 pts`**.
   - Click **`Apply Fix`**. Watch the task transition to `Applied` and show the toast confirming Trust Score restoration!
3. **2 AM Staleness Check Demo**:
   - Click **`Run 2 AM Staleness Sweep`**. Explain to your manager that this scheduled job runs every night to detect abandoned cloud VMs.

---

### Step 9: Settings: Schema Designer & Trust Score Weights (`/settings/*`)
1. **Navigate to `/settings/classes`**:
   - Browse the ServiceNow-compatible class inheritance tree (`cmdb_ci` &rarr; `cmdb_ci_hardware` &rarr; `cmdb_ci_server`).
   - Click any class node to inspect its inherited and active attributes.
2. **Navigate to `/settings/trust-score`**:
   - Show the 5 weight sliders: Freshness (30%), Completeness (25%), Consistency (20%), Relationships (15%), Ownership (10%).
   - Point out the **Worked Example calculation** for `PROD-DB-MUMBAI-01` demonstrating how the math derives the final composite score.
3. **Navigate to `/settings/roles`**:
   - Show the **RBAC Permissions Matrix** comparing `Viewer`, `Editor`, `CMDB Owner`, and `Admin`.
   - Use the header role switcher to demonstrate role-based access control.

---

## Summary Checklist for Your Manager
- [x] **Atlassian / Jira UI Design System**: Inter typography, Geist Mono IDs, 3px lozenges, and responsive grid.
- [x] **Full Light and Dark Mode**: Native `next-themes` pairing with ZenOps brand gradient accents.
- [x] **Zero Cross-Tenant Leakage**: Enterprise multi-tenancy strictly isolated at the service layer.
- [x] **Zero Heavy Dependencies**: Pure Next.js 14 App Router, React 18, and Tailwind CSS.
- [x] **Zero TypeScript Errors**: 100% type-safe compilation verified across every view and route.
