"use client";

import { useMemo } from "react";
import { useCMDB } from "@/context/cmdb-context";
import { AuthService } from "@/services/auth-service";
import { PermissionKey, can, ResourceContext, UserContext, PolicyDecision } from "@/lib/rbac";

export function usePermission(permission: PermissionKey, resource?: ResourceContext): PolicyDecision {
  const { session, userRole, activeTenant } = useCMDB();

  const decision = useMemo(() => {
    // Construct user context from active CMDB context & AuthService session
    const activeSession = session || AuthService.getSession();

    const userCtx: UserContext = {
      id: activeSession?.userId || "USR-DEMO",
      name: activeSession?.name || "Demo User",
      email: activeSession?.email || "demo@zenops.local",
      role: userRole || activeSession?.role || "Admin",
      tenantId: activeSession?.tenantId || "CMP_1001_ZENDEV",
      tenantName: activeTenant || activeSession?.tenantName || "ZenDev Software Technologies",
      groups: activeSession?.groups || [],
      services: activeSession?.services || [],
      isServiceAccount: activeSession?.isServiceAccount,
      connectorId: activeSession?.connectorId,
    };

    return can(userCtx, permission, resource);
  }, [session, userRole, activeTenant, permission, resource]);

  return decision;
}
