# ZenOps CMDB Role-Based Access Control (RBAC) Architecture & Specification

## 1. Executive Summary & Design Principles

The ZenOps Configuration Management Database (CMDB) implements an enterprise-grade, least-privilege Role-Based Access Control (RBAC) security layer designed to meet SOC 2 Type II, ISO/IEC 27001, and NIST SP 800-53 standards.

### Core Architectural Principles
1. **Least Privilege**: Anything not explicitly permitted is denied by default.
2. **Tenant Boundary Isolation**: Cross-tenant requests return **HTTP 404 Not Found** (never 403 Forbidden), guaranteeing that the existence of other tenants' assets is strictly invisible.
3. **Separation of Duties (SoD)**: Technical administrators who configure schemas, connectors, and reconciliation rules cannot approve data remediation tasks or self-certify production records.
4. **Dual Custody (Four-Eyes Principle)**: Merging, reconciling, or retiring production configuration items requires a second independent approver who is not the original requester.
5. **Just-In-Time (JIT) Temporary Elevation**: Time-bounded privilege exceptions with automatic expiration to prevent lingering privilege accumulation.
6. **Immutable Security Audit Log**: Every authorization check (granted or denied) and security event is recorded with cryptographic actor attribution.

---

## 2. Three-Tier Defense-in-Depth Enforcement Model

```
+-------------------------------------------------------------------------+
| Tier 1: Client UI Components & Presentation                             |
|  - <Can permission="..." resource={...}> conditional element wrappers   |
|  - usePermission(key, resource) reactive React hook                     |
|  - Disabled buttons with SoD explanatory tooltips                        |
|  - <AccessDenied /> and <NotFoundTenant /> theme-consistent views       |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| Tier 2: Next.js Middleware & Central Policy Engine (can())              |
|  - Route interception (/settings/security/*, /cis/*, etc.)              |
|  - can(user, permission, resource?) -> PolicyDecision                   |
|  - Auto-grant derivation (CI Owner / Service Owner from topology)       |
|  - Directory group to role resolution (SAML / OIDC / SCIM ready)        |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| Tier 3: PostgreSQL Database Row-Level Security (RLS)                    |
|  - db/rls.sql with tenant_isolation and ownership policies             |
|  - Append-only rbac_audit_log with trigger-level immutability           |
|  - Foreign key integrity for role_permissions and group_role_map        |
+-------------------------------------------------------------------------+
```

---

## 3. Permission Catalog (`src/lib/rbac/permissions.ts`)

ZenOps organizes privileges into 15 typed constants across 8 functional domains:

| Permission Key | Display Name | Domain | Description |
| :--- | :--- | :--- | :--- |
| `ci.view` | View Configuration Items | Inventory | Read access to CI records, dependencies, and attributes within scope |
| `ci.edit` | Edit Configuration Items | Inventory | Update CI fields, attributes, tags, and lifecycle states |
| `ci.notes` | Add Notes & Links | Operations | Add operational commentary, incident links, and triage notes |
| `ci.merge` | Merge CI Records | Governance | Merge duplicate or correlated CI payloads (SoD applies in production) |
| `ci.retire` | Retire CI Records | Governance | Decommission CIs and archive from active operational topology |
| `ci.attest` | Attest & Certify CIs | Governance | Certify accuracy and operational validity during attestation campaigns |
| `task.approve` | Approve Tasks & Fixes | Operations | Authorize data quality fixes, anomaly remediations, and reconciliation approvals |
| `rules.edit` | Edit Reconciliation Rules | Administration | Authorize creation, ordering, and tuning of IRE precedence matrices |
| `rules.approve` | Approve Rule Changes | Governance | Authorize deployment of new or revised IRE identification rules |
| `discovery.configure` | Configure Discovery | Telemetry | Add/edit discovery sources, schedules, agent credentials, and scopes |
| `staging.write` | Ingest Staging Telemetry | Ingestion | Ingest raw agent and cloud telemetry payloads into staging buffers |
| `roles.manage` | Manage Security & Roles | Security | Administer system roles, directory group mappings, and JIT exceptions |
| `audit.view` | View Security Audit Logs | Compliance | Read historical audit trails and real-time security alerts |
| `dashboard.view` | View CMDB Dashboards | Reporting | View executive health metrics, KPI trend cards, and macro graphs |
| `attestation.manage` | Launch Attestation Campaigns | Governance | Create, schedule, and initialize tenant-wide attestation campaigns |

---

## 4. System Roles & Access Matrix (`src/lib/rbac/roles.ts`)

ZenOps provides 12 pre-configured, immutable System Roles plus dedicated Service Account and Emergency Break-Glass roles:

| Role Name | Key | Permissions | Scope Boundary | Review Date |
| :--- | :--- | :--- | :--- | :--- |
| **CMDB Manager** | `cmdb_manager` | `ci.view`, `ci.merge`, `ci.retire`, `task.approve`, `rules.approve`, `audit.view`, `dashboard.view`, `attestation.manage` | Whole Tenant | Annual (2026-12-31) |
| **CMDB Administrator** | `cmdb_admin` | `ci.view`, `ci.edit`, `ci.merge`, `ci.retire`, `discovery.configure`, `rules.edit`, `roles.manage`, `audit.view`, `dashboard.view` *(NEVER task.approve)* | Whole Tenant | Annual (2026-12-31) |
| **Data Steward** | `data_steward` | `ci.view`, `ci.edit`, `ci.merge`, `ci.retire`, `task.approve`, `dashboard.view`, `attestation.manage` | Whole Tenant (Production dual-custody) | Semi-Annual (2026-12-31) |
| **Discovery / Integration Admin** | `discovery_admin` | `ci.view`, `discovery.configure`, `audit.view` (connector logs only), `dashboard.view` | Connector telemetry & staging | Semi-Annual (2026-12-31) |
| **CI Owner** *(Auto-Granted)* | `ci_owner` | `ci.view`, `ci.edit`, `ci.attest`, `task.approve` | Only CIs where `owner_group IN user.groups` | Continuous Data-Derived |
| **Service Owner** *(Auto-Granted)* | `service_owner` | `ci.view`, `ci.edit` (service fields), `ci.attest`, `task.approve` | Only owned business services | Continuous Data-Derived |
| **Service Desk Agent** | `service_desk` | `ci.view` only | Whole Tenant (Read-only) | Annual (2026-12-31) |
| **Change Manager** | `change_manager` | `ci.view`, `audit.view` (change events) | Whole Tenant | Annual (2026-12-31) |
| **Incident / Problem Analyst** | `problem_analyst` | `ci.view`, `ci.notes` | Whole Tenant | Annual (2026-12-31) |
| **Auditor** | `auditor` | `ci.view`, `audit.view`, `dashboard.view` *(Read-only everywhere)* | Whole Tenant (Read-only) | Annual (2026-12-31) |
| **Executive / Report Viewer** | `executive` | `dashboard.view` only | Dashboard KPIs only (No CI records) | Annual (2026-12-31) |
| **Integration Service Account** | `integration_service_account`| `staging.write` | Non-human; API staging buffer only | 90-Day Rotation |
| **Break-Glass Emergency Admin** | `break_glass_admin` | All permissions | Whole Tenant (Triggers immediate SOC alert) | Emergency Window |

---

## 5. Scope Engine & Tenant Isolation (`src/lib/rbac/scope.ts`)

Every access evaluation passes through a deterministic boundary engine:
1. **Tenant Isolation**: Evaluated before role permissions. If `resource.tenantId !== user.tenantId`, the engine flags `notFound: true`, ensuring the UI and API return 404 rather than 403.
2. **Owned-By-Me Scope**: Automatically resolves whether `resource.owner_group IN user.groups` or `resource.owner === user.email`.
3. **Service-Scoped Boundary**: Evaluates whether `resource.service IN user.services`.
4. **Environment / Class Filters**: Restricts custom roles to specific tiers (e.g. Non-Production only, or Server/VM only).

---

## 6. Separation of Duties (SoD) & Governance Rules (`src/lib/rbac/rules.ts`)

ZenOps enforces 5 critical SoD rules to eliminate toxic combinations:
1. **`admin_cannot_approve`**:
   - CMDB Administrators configure the platform but **cannot approve data quality tasks or auto-fixes**.
   - UI Behavior: "Apply Auto-Fix" button is disabled for Sarah Jenkins (Admin) with the tooltip: *"Administrators cannot approve data fixes (SoD rule: admin_cannot_approve)"*.
2. **`four_eyes_for_production`**:
   - Merging or retiring CIs in `environment: "Production"` requires a verified second approver who is not the requester (`resource.secondApproverId !== user.id`).
3. **`discovery_admin_cannot_merge`**:
   - Discovery Administrators can register connectors and trigger scans, but cannot directly merge staging payloads into live production CIs.
4. **`service_account_cannot_login`**:
   - Service accounts (`svc-discovery-aws`, etc.) are automated non-human credentials restricted to API ingestion (`staging.write`); interactive UI logins are rejected.
5. **`break_glass_alert`**:
   - Any access via the break-glass emergency credential generates an immediate critical security alert dispatched to the incident log.

---

## 7. Automated Test Suite Verification

The automated test suite (`tests/rbac.test.ts`) tests all 12 mandatory enterprise security scenarios:

```
================================================================================
            ZenOps CMDB Role-Based Access Control (RBAC) Test Suite             
================================================================================
[✓ PASS] Scenario 1: Service Desk Agent edits a CI -> Denied
[✓ PASS] Scenario 2: CI Owner edits CI owned by another group -> Denied
[✓ PASS] Scenario 3: CI Owner edits own CI -> Allowed + audit entry
[✓ PASS] Scenario 4: Administrator approves data quality task -> Denied (SoD: admin_cannot_approve)
[✓ PASS] Scenario 5: Steward merges two production CIs -> Waits for second approver (Four-Eyes dual custody)
[✓ PASS] Scenario 6: Connector account writes to staging -> Allowed
[✓ PASS] Scenario 7: Connector account writes to live CIs -> Denied
[✓ PASS] Scenario 8: User from tenant A requests tenant B CI -> Not found (404 isolation)
[✓ PASS] Scenario 9: Auditor tries any edit -> Denied
[✓ PASS] Scenario 10: User removed from directory group -> access gone at next login
[✓ PASS] Scenario 11: Temporary access reaches end date -> removed automatically
[✓ PASS] Scenario 12: Executive opens /cis -> No access (dashboard.view only)
================================================================================
Results: 12/12 Passed (0 Failed)
================================================================================
```

To run the test suite at any time:
```bash
npm test
```

---

## 8. Rollout Modes: Enforce vs. Audit-Only

ZenOps supports zero-downtime RBAC rollout via a real-time configuration toggle located under **Settings > Security**:
- **Audit-Only Mode (`audit-only`)**: Evaluates permissions and logs what *would* have been blocked into the audit stream (`AUDIT_MODE_PERMITTED_VIOLATION`), but does not block user actions. Ideal for auditing existing production workflows prior to enforcement.
- **Enforce Mode (`enforce`)**: Actively enforces least privilege, blocking unpermitted actions and rendering `<AccessDenied />` screens. Default for production operation.

---

## 9. Database Architecture & PostgreSQL Row-Level Security (`db/rls.sql`)

The database layer enforces security directly in PostgreSQL via Row-Level Security (RLS):

```sql
-- Tenant Isolation Policy
ALTER TABLE ci ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON ci
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- CI Ownership Policy (CI Owner only edits CIs of user groups)
CREATE POLICY ci_owner_scope_policy ON ci
  FOR UPDATE
  USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    AND (
      owner_group = ANY (string_to_array(current_setting('app.user_groups', true), ','))
      OR owner = current_setting('app.user_email', true)
    )
  );
```

---

## 10. Production Migration Guide (Mock -> Real Backend)

To migrate from the current mock architecture to production enterprise APIs:

1. **Identity Provider (IdP)**: Connect SAML 2.0 / OIDC (Okta, Azure AD, Ping) to populate `session.user.groups` from IdP directory claims on OAuth callback.
2. **Database Context**: In Next.js Server Actions or API route handlers, execute:
   ```sql
   SET LOCAL app.tenant_id = $tenantId;
   SET LOCAL app.user_id = $userId;
   SET LOCAL app.user_groups = $groupsCsv;
   ```
3. **Policy Engine**: Replace in-memory lookup in `app/api/rbac/check/route.ts` with direct SQL queries against `role_permissions` and `sod_policy_rules`.
4. **Audit Logging**: Stream entries from `AccessAuditService` to enterprise SIEMs (Splunk, Datadog, AWS CloudWatch) via HTTPS webhook or Kafka producer.
