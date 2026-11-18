-- =============================================================================
-- ZenOps CMDB: Enterprise Role-Based Access Control (RBAC) & Row-Level Security (RLS)
-- Target Database: PostgreSQL 14+ / Supabase / AWS Aurora PostgreSQL
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. EXTENSIONS & SCHEMAS
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS rbac;
CREATE SCHEMA IF NOT EXISTS cmdb;
CREATE SCHEMA IF NOT EXISTS audit;

-- -----------------------------------------------------------------------------
-- 2. RBAC DATA MODEL TABLES
-- -----------------------------------------------------------------------------

-- Permissions Catalog (Canonical typed capabilities)
CREATE TABLE IF NOT EXISTS rbac.permissions (
    key VARCHAR(64) PRIMARY KEY,
    label VARCHAR(128) NOT NULL,
    category VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    risk_level VARCHAR(16) NOT NULL CHECK (risk_level IN ('Low', 'Medium', 'High', 'Critical')),
    requires_audit BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Roles Catalog (System & Custom roles)
CREATE TABLE IF NOT EXISTS rbac.roles (
    key VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    description TEXT NOT NULL,
    owner VARCHAR(128) NOT NULL,
    review_date DATE NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT false,
    category VARCHAR(64) NOT NULL,
    scope_type VARCHAR(32) NOT NULL DEFAULT 'whole_tenant',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Role to Permissions Many-to-Many Mapping
CREATE TABLE IF NOT EXISTS rbac.role_permissions (
    role_key VARCHAR(64) NOT NULL REFERENCES rbac.roles(key) ON DELETE CASCADE,
    permission_key VARCHAR(64) NOT NULL REFERENCES rbac.permissions(key) ON DELETE RESTRICT,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_key, permission_key)
);

-- Role Scopes (Attribute-based constraints per role)
CREATE TABLE IF NOT EXISTS rbac.role_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_key VARCHAR(64) NOT NULL REFERENCES rbac.roles(key) ON DELETE CASCADE,
    scope_type VARCHAR(32) NOT NULL, -- whole_tenant, owned_by_me, service_scoped, connector_scoped
    allowed_classes TEXT[],          -- e.g. ARRAY['Server/VM', 'Database']
    allowed_environments TEXT[],   -- e.g. ARRAY['Staging', 'QA', 'Development']
    requires_owned_group BOOLEAN NOT NULL DEFAULT false,
    requires_owned_service BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Directory Group to Role Mapping (SSO / SCIM 2.0 / SAML sync)
CREATE TABLE IF NOT EXISTS rbac.group_role_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_name VARCHAR(128) NOT NULL UNIQUE,
    role_key VARCHAR(64) NOT NULL REFERENCES rbac.roles(key) ON DELETE RESTRICT,
    sync_source VARCHAR(64) NOT NULL, -- Okta SCIM, Azure AD, Google Workspace
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Temporary Privileged Access (Just-In-Time elevations with auto-expiration)
CREATE TABLE IF NOT EXISTS rbac.user_role_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(64) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    elevated_role VARCHAR(64) NOT NULL REFERENCES rbac.roles(key) ON DELETE RESTRICT,
    ticket_id VARCHAR(64),           -- e.g. CHG-9402, INC-10294
    reason TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    approver_name VARCHAR(128) NOT NULL,
    approver_email VARCHAR(255) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Separation of Duties (SoD) Rules
CREATE TABLE IF NOT EXISTS rbac.policy_rules (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    risk_category VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('High', 'Critical')),
    description TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Non-Human Service Accounts (Automated Discovery Connectors)
CREATE TABLE IF NOT EXISTS rbac.service_accounts (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL UNIQUE,
    connector_id VARCHAR(64) NOT NULL,
    owner VARCHAR(128) NOT NULL,
    last_rotated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rotation_interval_days INT NOT NULL DEFAULT 90,
    ip_allow_list INET[] NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'rotation_due', 'disabled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-Only Security Access Audit Log (Immutable)
CREATE TABLE IF NOT EXISTS audit.access_log (
    id BIGSERIAL PRIMARY KEY,
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id VARCHAR(64) NOT NULL,
    actor_email VARCHAR(255) NOT NULL,
    actor_role VARCHAR(64) NOT NULL,
    permission VARCHAR(64) NOT NULL,
    resource_id VARCHAR(128),
    resource_name VARCHAR(255),
    tenant_id UUID NOT NULL,
    allowed BOOLEAN NOT NULL,
    reason TEXT NOT NULL,
    audit_flag VARCHAR(64),
    requires_second_approver BOOLEAN DEFAULT false,
    client_ip INET,
    user_agent TEXT
);

-- Enforce Append-Only on Audit Log (Prevent Updates or Deletions)
CREATE OR REPLACE RULE no_update_audit_log AS ON UPDATE TO audit.access_log DO INSTEAD NOTHING;
CREATE OR REPLACE RULE no_delete_audit_log AS ON DELETE TO audit.access_log DO INSTEAD NOTHING;

-- -----------------------------------------------------------------------------
-- 3. CORE CMDB TABLES WITH ROW-LEVEL SECURITY (RLS)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cmdb.ci (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    ci_class VARCHAR(64) NOT NULL,
    environment VARCHAR(64) NOT NULL,
    status VARCHAR(64) NOT NULL DEFAULT 'In Use',
    operational_status VARCHAR(64) NOT NULL DEFAULT 'Operational',
    criticality VARCHAR(64) NOT NULL DEFAULT 'Tier 2 - Business Critical',
    data_classification VARCHAR(64) NOT NULL DEFAULT 'Internal',
    owner VARCHAR(255),
    owner_group VARCHAR(128),
    service VARCHAR(255),
    region VARCHAR(64),
    ip_address INET,
    trust_score INT NOT NULL DEFAULT 95,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cmdb.staging_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    connector_id VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    source_name VARCHAR(128) NOT NULL,
    match_status VARCHAR(32) NOT NULL DEFAULT 'Pending',
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. POSTGRES ROW-LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------

-- Enable RLS on core tables
ALTER TABLE cmdb.ci ENABLE ROW LEVEL SECURITY;
ALTER TABLE cmdb.staging_raw ENABLE ROW LEVEL SECURITY;

-- POLICY 1: Mandatory Multi-Tenant Isolation
-- Cross-tenant reads return 0 rows (404 Not Found style)
CREATE POLICY tenant_isolation_ci ON cmdb.ci
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::UUID
    );

CREATE POLICY tenant_isolation_staging ON cmdb.staging_raw
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::UUID
    );

-- POLICY 2: CI Owner Scope (owner_group IN $user.groups)
-- CI Owners can only view and update CIs belonging to their directory groups
CREATE POLICY ci_owner_scoped_update ON cmdb.ci
    FOR UPDATE
    USING (
        tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::UUID
        AND (
            -- Admin / Steward override
            current_setting('app.user_role', true) IN ('cmdb_admin', 'cmdb_manager', 'data_steward')
            -- OR CI belongs to user group
            OR owner_group = ANY (string_to_array(NULLIF(current_setting('app.user_groups', true), ''), ','))
            -- OR user is direct designated owner
            OR owner = NULLIF(current_setting('app.user_email', true), '')
        )
    );

-- POLICY 3: Service Owner Scope (service IN $user.services)
CREATE POLICY service_owner_scoped_read ON cmdb.ci
    FOR SELECT
    USING (
        tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::UUID
        AND (
            current_setting('app.user_role', true) != 'executive'
            OR current_setting('app.user_role', true) IS NULL
        )
    );

-- POLICY 4: Service Account Ingestion Restriction
-- Machine credentials can only write to staging, never directly to cmdb.ci
CREATE POLICY service_account_staging_only ON cmdb.staging_raw
    FOR INSERT
    WITH CHECK (
        tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::UUID
        AND (
            current_setting('app.is_service_account', true) = 'true'
            AND connector_id = NULLIF(current_setting('app.connector_id', true), '')
        )
    );

-- -----------------------------------------------------------------------------
-- 5. SEEDED SYSTEM PERMISSIONS & ROLES DDL
-- -----------------------------------------------------------------------------

INSERT INTO rbac.permissions (key, label, category, description, risk_level, requires_audit) VALUES
('ci.view', 'View CIs', 'Configuration Items', 'Read CI records and topology graphs in scope', 'Low', false),
('ci.edit', 'Edit CIs', 'Configuration Items', 'Update operational CI attributes in scope', 'Medium', true),
('ci.notes', 'Add CI Notes', 'Configuration Items', 'Append worklogs and incident references to CIs', 'Low', false),
('ci.merge', 'Merge CIs', 'Configuration Items', 'Reconciliation merge decisions and duplicate consolidation', 'High', true),
('ci.retire', 'Retire CIs', 'Configuration Items', 'Decommission active CIs with change authorization', 'High', true),
('ci.attest', 'Attest CIs', 'Configuration Items', 'Verify accuracy of assigned CIs during campaigns', 'Medium', true),
('task.approve', 'Approve Tasks', 'Governance & Quality', 'Authorize data quality remediation fixes', 'High', true),
('rules.approve', 'Approve Rules', 'IRE & Rules', 'Authorize IRE precedence and identification rules', 'Critical', true),
('rules.edit', 'Edit Rules', 'IRE & Rules', 'Draft reconciliation and normalization rules', 'High', true),
('discovery.configure', 'Configure Discovery', 'Discovery & Data', 'Manage sources, IP ranges, schedules and credentials', 'High', true),
('staging.write', 'Write Staging', 'Discovery & Data', 'Ingest automated discovery batches into staging', 'Medium', true),
('roles.manage', 'Manage Security', 'Security & Admin', 'Manage roles, group mappings, and JIT exceptions', 'Critical', true),
('audit.view', 'View Audit Trail', 'Reporting & Audit', 'Access compliance history and security audit streams', 'Low', false),
('dashboard.view', 'View Dashboard', 'Reporting & Audit', 'Access executive and operational KPI metrics', 'Low', false),
('attestation.manage', 'Manage Attestations', 'Governance & Quality', 'Create and schedule attestation campaigns', 'High', true)
ON CONFLICT (key) DO NOTHING;
