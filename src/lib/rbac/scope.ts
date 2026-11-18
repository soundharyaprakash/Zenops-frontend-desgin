/**
 * ZenOps CMDB Role-Based Access Control (RBAC) - Scope Engine
 *
 * Scopes constrain WHERE a role's permissions apply.
 * Tenant Isolation: Tenant boundary is evaluated first.
 * If a resource belongs to a different tenant, it is treated as "Not Found" (404 style),
 * never leaking the existence of other tenants' records.
 */

import { PermissionKey } from "./permissions";

export interface ScopeRule {
  /** Target scope boundary */
  type: "whole_tenant" | "owned_by_me" | "service_scoped" | "connector_scoped" | "filtered";
  /** Human-readable description of this scope */
  description: string;
  /** Optional filter criteria */
  filters?: {
    classes?: string[]; // e.g. ["Server/VM", "Database"]
    environments?: string[]; // e.g. ["Production", "Staging"]
    regions?: string[]; // e.g. ["us-east-1", "eu-west-1"]
    services?: string[]; // e.g. ["Payment Processing"]
    requiresOwnedGroup?: boolean; // owner_group IN user.groups
    requiresOwnedService?: boolean; // service IN user.services
    connectorOnly?: boolean; // Only for specific discovery connector
  };
}

export interface ResourceContext {
  id?: string;
  name?: string;
  tenantId?: string;
  tenantName?: string;
  ciClass?: string;
  environment?: string;
  region?: string;
  service?: string;
  ownerGroup?: string;
  owner?: string;
  connectorId?: string;
  [key: string]: any;
}

export interface UserContext {
  id: string;
  name: string;
  email: string;
  role: string;
  roles?: string[];
  tenantId: string;
  tenantName?: string;
  groups?: string[];
  services?: string[];
  isServiceAccount?: boolean;
  connectorId?: string;
}

/**
 * Standard Scope Definitions (YAML-like Policy Objects)
 */
export const SCOPE_POLICIES = {
  WHOLE_TENANT: {
    type: "whole_tenant",
    description: "Applies across all configuration items, services, and discovery assets in the tenant.",
  } as ScopeRule,

  OWNED_BY_ME: {
    type: "owned_by_me",
    description: "Scoped strictly to CIs where the CI owner group matches user directory groups (owner_group IN $user.groups).",
    filters: {
      requiresOwnedGroup: true,
    },
  } as ScopeRule,

  SERVICE_OWNED: {
    type: "service_scoped",
    description: "Scoped strictly to business services and downstream CIs owned by the user (service IN $user.services).",
    filters: {
      requiresOwnedService: true,
    },
  } as ScopeRule,

  CONNECTOR_STAGING: {
    type: "connector_scoped",
    description: "Scoped exclusively to raw discovery payload ingestion for the assigned connector ID.",
    filters: {
      connectorOnly: true,
    },
  } as ScopeRule,

  NON_PRODUCTION: {
    type: "filtered",
    description: "Scoped only to non-production environments (Staging, Development, Test, QA).",
    filters: {
      environments: ["Staging", "QA / Test", "Development"],
    },
  } as ScopeRule,
};

/**
 * Check whether a resource is within the user's role scope
 */
export function isResourceInScope(
  user: UserContext,
  scopeRule: ScopeRule,
  resource?: ResourceContext
): { inScope: boolean; reason?: string } {
  // If no resource is provided (e.g. general page or create action check), scope passes
  if (!resource) {
    return { inScope: true };
  }

  // 1. Mandatory Tenant Boundary (Strict Isolation)
  if (resource.tenantId && user.tenantId && resource.tenantId !== user.tenantId) {
    return {
      inScope: false,
      reason: "Resource not found (tenant boundary isolation).",
    };
  }

  // If tenant name is provided, verify match
  if (resource.tenantName && user.tenantName && resource.tenantName !== user.tenantName) {
    return {
      inScope: false,
      reason: "Resource not found (tenant boundary isolation).",
    };
  }

  // 2. Whole Tenant Scope
  if (scopeRule.type === "whole_tenant") {
    return { inScope: true };
  }

  const filters = scopeRule.filters;
  if (!filters) {
    return { inScope: true };
  }

  // 3. Owned-by-me Scope: owner_group IN user.groups OR user.email is owner
  if (filters.requiresOwnedGroup) {
    const userGroups = user.groups || [];
    const resourceGroup = resource.ownerGroup || resource.owner_group;
    const resourceOwner = resource.owner || resource.assignedTo;

    const matchesGroup = resourceGroup && userGroups.includes(resourceGroup);
    const matchesEmail = resourceOwner && (
      resourceOwner.toLowerCase() === user.email.toLowerCase() ||
      resourceOwner.toLowerCase() === user.name.toLowerCase()
    );

    if (!matchesGroup && !matchesEmail) {
      return {
        inScope: false,
        reason: `CI ownership required: Resource group '${resourceGroup || "none"}' does not match your active groups [${userGroups.join(", ")}].`,
      };
    }
  }

  // 4. Service-Owned Scope: service IN user.services
  if (filters.requiresOwnedService) {
    const userServices = user.services || [];
    const resourceService = resource.service || resource.name;

    const matchesService = resourceService && userServices.some(
      (s) => s.toLowerCase() === resourceService.toLowerCase()
    );

    if (!matchesService) {
      return {
        inScope: false,
        reason: `Service ownership required: '${resourceService || "unknown"}' is not in your registered services list.`,
      };
    }
  }

  // 5. Environment Filter
  if (filters.environments && filters.environments.length > 0 && resource.environment) {
    const envMatch = filters.environments.some(
      (env) => env.toLowerCase() === resource.environment?.toLowerCase()
    );
    if (!envMatch) {
      return {
        inScope: false,
        reason: `Environment restricted: Role is only permitted on [${filters.environments.join(", ")}], but resource is '${resource.environment}'.`,
      };
    }
  }

  // 6. Class Filter
  if (filters.classes && filters.classes.length > 0 && resource.ciClass) {
    const classMatch = filters.classes.includes(resource.ciClass);
    if (!classMatch) {
      return {
        inScope: false,
        reason: `Class restricted: Resource class '${resource.ciClass}' is outside role allowed classes.`,
      };
    }
  }

  // 7. Connector Isolation
  if (filters.connectorOnly) {
    if (user.isServiceAccount && user.connectorId && resource.connectorId) {
      if (user.connectorId !== resource.connectorId) {
        return {
          inScope: false,
          reason: `Connector mismatch: Service account is bound to '${user.connectorId}', cannot ingest for '${resource.connectorId}'.`,
        };
      }
    }
  }

  return { inScope: true };
}
