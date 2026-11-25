"use client";

import React from "react";
import {
  Shield,
  Check,
  X,
  Users,
  Lock,
  UserCheck,
  AlertOctagon,
  Eye,
  Edit2,
  Trash2,
  GitMerge,
  Award,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Lozenge } from "@/components/ui/Lozenge";
import { Button } from "@/components/ui/Button";
import { useCMDB, UserRole } from "@/context/cmdb-context";
import { cn } from "@/lib/utils";

interface PermissionRow {
  permission: string;
  description: string;
  viewer: boolean;
  editor: boolean;
  cmdbOwner: boolean;
  admin: boolean;
}

export function RolesPermissionsView() {
  const { userRole, setUserRole, activeTenant, showToast } = useCMDB();

  const permissions: PermissionRow[] = [
    {
      permission: "View CI Inventory & Topology",
      description: "Search, filter, view 360 CI profiles and relationship dependency maps",
      viewer: true,
      editor: true,
      cmdbOwner: true,
      admin: true,
    },
    {
      permission: "Export CMDB Data (JSON & CSV)",
      description: "Download catalog snapshots, audit history, and filtered queries",
      viewer: true,
      editor: true,
      cmdbOwner: true,
      admin: true,
    },
    {
      permission: "Create & Edit Non-Production CIs",
      description: "Provision staging/test assets and update non-authoritative attributes",
      viewer: false,
      editor: true,
      cmdbOwner: true,
      admin: true,
    },
    {
      permission: "Inline Edit & Update Live Attributes",
      description: "Modify operational fields with automatic immutable audit logging",
      viewer: false,
      editor: true,
      cmdbOwner: true,
      admin: true,
    },
    {
      permission: "Resolve & Apply Data Quality Tasks",
      description: "Approve automated remediation fixes and restore degraded Trust Scores (Blocked for Admin by SoD)",
      viewer: false,
      editor: false,
      cmdbOwner: true,
      admin: false, // Strict SoD: admin_cannot_approve!
    },
    {
      permission: "Execute IRE Reconciliation & Merge",
      description: "Approve duplicate identification merges and resolve source conflicts",
      viewer: false,
      editor: false,
      cmdbOwner: true,
      admin: true,
    },
    {
      permission: "Certify Attestation Campaigns",
      description: "Sign off on quarterly ownership and operational verification cycles",
      viewer: false,
      editor: false,
      cmdbOwner: true,
      admin: true,
    },
    {
      permission: "Retire Production CIs (Requires CAB CR)",
      description: "Decommission production assets with blast-radius checks and CHG- records",
      viewer: false,
      editor: false,
      cmdbOwner: true,
      admin: true,
    },
    {
      permission: "Configure Discovery & Vault Credentials",
      description: "Add cloud connectors, manage API keys, and set scan schedules",
      viewer: false,
      editor: false,
      cmdbOwner: false,
      admin: true,
    },
    {
      permission: "Manage Trust Score Weights & Schema",
      description: "Configure algorithmic weights, class inheritance, and custom attributes",
      viewer: false,
      editor: false,
      cmdbOwner: false,
      admin: true,
    },
    {
      permission: "Tenant & RBAC Role Administration",
      description: "Switch organizations, assign user roles, and manage system access",
      viewer: false,
      editor: false,
      cmdbOwner: false,
      admin: true,
    },
  ];

  const handleSwitchRole = (role: UserRole) => {
    setUserRole(role);
    showToast("info", "Role Switched", `Active session role updated to ${role}.`);
  };

  return (
    <div className="space-y-6 pb-12 text-text-default">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-default">
              Role-Based Access Control (RBAC) Permissions Matrix
            </h1>
            <Lozenge appearance="subtle" variant="info" size="sm">
              Active Role: {userRole}
            </Lozenge>
            <span className="inline-flex items-center gap-1.5 text-xs text-text-muted bg-sunken px-2.5 py-1 rounded border border-border/60">
              <Lock className="w-3.5 h-3.5 text-text-muted" />
              {activeTenant}
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Governance authority matrix governing CI lifecycle mutations, change record enforcement, and administrative capabilities
          </p>
        </div>

        {/* Quick Role Switcher for Demo */}
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/settings/security/matrix"
            className="text-xs font-semibold text-primary hover:underline px-2.5 py-1.5 rounded bg-primary/10 border border-primary/20 flex items-center gap-1.5"
          >
            <Shield className="w-3.5 h-3.5" />
            View Enterprise 12-Role Matrix
          </a>
          <div className="flex items-center gap-1.5 p-1 bg-sunken rounded-md border border-border flex-wrap">
            <span className="text-xs font-semibold text-text-muted px-2">Simulate Role:</span>
            {(["Viewer", "Editor", "CMDB Owner", "Admin"] as UserRole[]).map((r) => (
              <button
                key={r}
                onClick={() => handleSwitchRole(r)}
                className={cn(
                  "px-3 py-1.5 rounded text-xs sm:text-sm font-semibold transition-all",
                  userRole === r
                    ? "bg-primary text-white shadow-xs"
                    : "text-text-secondary hover:text-text-default hover:bg-surface"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Permissions Table Card */}
      <Card className="bg-surface border-border overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-sunken border-b border-border text-xs uppercase tracking-wider text-text-secondary select-none">
                <tr>
                  <th className="py-3 px-4">Capability / Operation</th>
                  <th className="py-3 px-3 text-center w-28">Viewer</th>
                  <th className="py-3 px-3 text-center w-28">Editor</th>
                  <th className="py-3 px-3 text-center w-36">CMDB Owner</th>
                  <th className="py-3 px-3 text-center w-28">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {permissions.map((row) => (
                  <tr key={row.permission} className="hover:bg-sunken/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-text-default block text-sm">{row.permission}</span>
                      <span className="text-xs text-text-muted leading-relaxed block mt-0.5">
                        {row.description}
                      </span>
                    </td>

                    {/* Viewer */}
                    <td className="py-3.5 px-3 text-center">
                      {row.viewer ? (
                        <Check className="w-4 h-4 text-success mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-text-muted/40 mx-auto" />
                      )}
                    </td>

                    {/* Editor */}
                    <td className="py-3.5 px-3 text-center">
                      {row.editor ? (
                        <Check className="w-4 h-4 text-success mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-text-muted/40 mx-auto" />
                      )}
                    </td>

                    {/* CMDB Owner */}
                    <td className="py-3.5 px-3 text-center">
                      {row.cmdbOwner ? (
                        <Check className="w-4 h-4 text-success mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-text-muted/40 mx-auto" />
                      )}
                    </td>

                    {/* Admin */}
                    <td className="py-3.5 px-3 text-center">
                      {row.admin ? (
                        <Check className="w-4 h-4 text-success mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-text-muted/40 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
