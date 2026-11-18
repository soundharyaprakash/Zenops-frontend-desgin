"use client";

import React from "react";
import { RelationshipGraph } from "@/components/cmdb/RelationshipGraph";
import { usePermission } from "@/components/rbac/usePermission";
import { AccessDenied } from "@/components/rbac/AccessDenied";
import { PERMISSIONS } from "@/lib/rbac/permissions";

export function RelationshipsView() {
  const { allowed: canViewCI, reason: denyReason } = usePermission(PERMISSIONS.CI_VIEW);

  if (!canViewCI) {
    return (
      <AccessDenied
        requiredPermission={PERMISSIONS.CI_VIEW}
        reason={denyReason || "Executive / Report Viewer role has dashboard.view only and cannot access CI relationships or topology graphs."}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in-up">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0A192F] tracking-tight">
          CI Relationships & Topology
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Dependency Mapping, Directional Service Graphs and Architectural Criticality
        </p>
      </div>

      <RelationshipGraph />
    </div>
  );
}

