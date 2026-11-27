"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  User as UserIcon,
  Shield,
  Building2,
  Mail,
  Briefcase,
  Clock,
  Key,
  CheckCircle2,
  ExternalLink,
  Edit3,
  Layers,
  Lock,
  UserCheck,
  RefreshCw,
  LogOut,
  Globe,
  Calendar,
  Sparkles,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { useCMDB } from "@/context/cmdb-context";
import { AuthService } from "@/services/auth-service";
import { CIAuditHistory } from "@/types/cmdb";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Lozenge } from "@/components/ui/Lozenge";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export function UserProfileView() {
  const { session, userRole, activeTenant, auditHistory, logout, updateUserProfile } = useCMDB();

  const [activeTab, setActiveTab] = useState<"overview" | "permissions" | "activity">("overview");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState(session?.name || "");
  const [editTitle, setEditTitle] = useState(session?.title || "");

  const allUsers = AuthService.getAllUsers();

  // Find user's full data record
  const currentFullUser = allUsers.find(
    (u) => u.email.toLowerCase() === (session?.email || "").toLowerCase()
  ) || allUsers[0];

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    updateUserProfile({
      name: editName.trim(),
      title: editTitle.trim(),
    });
    setIsEditModalOpen(false);
  };

  // Recent user activity from audit history
  const userActivities: CIAuditHistory[] = (auditHistory || [])
    .filter((log: CIAuditHistory) => log.changedBy?.toLowerCase() === (session?.name || "").toLowerCase())
    .slice(0, 8);

  const expiresDate = session?.expiresAt ? new Date(session.expiresAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) : "30 Days (Active)";

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ----------------------------------------------------------------------- */}
      {/* 1. TOP HEADER & BREADCRUMB */}
      {/* ----------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-muted mb-1 font-medium">
            <Link href="/dashboard" className="hover:text-primary transition-colors">
              CMDB
            </Link>
            <span>/</span>
            <span className="text-text-default">User Profile & Identity</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-default tracking-tight flex items-center gap-2.5">
            <span>User Profile & Identity</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
              {session?.userId || "USR-1001"}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Enterprise session credentials, directory group mappings, RBAC scope, and persona testing
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Edit3 className="w-4 h-4 text-primary" />}
            onClick={() => {
              setEditName(session?.name || "");
              setEditTitle(session?.title || "");
              setIsEditModalOpen(true);
            }}
          >
            Edit Profile
          </Button>
          <Button
            size="sm"
            variant="danger"
            leftIcon={<LogOut className="w-4 h-4" />}
            onClick={logout}
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* 2. HERO PROFILE BANNER CARD */}
      {/* ----------------------------------------------------------------------- */}
      <Card className="p-5 sm:p-6 bg-surface border border-border rounded-xl shadow-xs relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-96 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          {/* User Info Avatar + Details */}
          <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
            <div className="relative shrink-0">
              <Avatar
                name={session?.name || "Sarah Jenkins"}
                size="lg"
                presence="online"
                className="w-16 h-16 sm:w-20 sm:h-20 text-xl font-bold border-2 border-primary/30 shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-success text-white shadow-xs" title="Active & Authenticated">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-extrabold text-text-default truncate">
                  {session?.name || "Sarah Jenkins"}
                </h2>
                <Lozenge variant="info" size="sm">
                  {session?.role || userRole}
                </Lozenge>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-success/10 text-success border border-success/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  Active Session
                </span>
              </div>

              <p className="text-xs sm:text-sm text-text-secondary flex items-center gap-1.5 truncate font-medium">
                <Briefcase className="w-3.5 h-3.5 text-text-muted shrink-0" />
                <span>{session?.title || "Principal Platform Engineer"}</span>
                <span className="text-text-muted">•</span>
                <Mail className="w-3.5 h-3.5 text-text-muted shrink-0" />
                <span className="text-text-default font-mono">{session?.email || "sarah.jenkins@gmail.com"}</span>
              </p>

              <div className="flex items-center gap-3 pt-1 text-xs text-text-muted flex-wrap">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  <strong className="text-text-default font-medium">{session?.tenantName || activeTenant}</strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-text-muted" />
                  <span className="font-mono text-[11px]">{session?.tenantDomain || "zendev.zenops.io"}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-emerald-500" />
                  <span>MFA Enforced</span>
                </span>
              </div>
            </div>
          </div>

          {/* Account Security & Sign Out CTA */}
          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-center gap-2 shrink-0 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Account Security
            </span>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<LogOut className="w-3.5 h-3.5 text-danger" />}
              onClick={logout}
              className="hover:border-danger/40 hover:text-danger"
            >
              Sign Out & Switch User
            </Button>
            <span className="text-[10px] text-text-muted">
              Sign out to log in with another demo account
            </span>
          </div>
        </div>
      </Card>

      {/* ----------------------------------------------------------------------- */}
      {/* 3. KEY METRICS TILES */}
      {/* ----------------------------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-primary" />
            User ID
          </span>
          <span className="font-mono font-bold text-lg text-text-default block">
            {session?.userId || currentFullUser?.id || "USR-1001"}
          </span>
          <span className="text-[11px] text-text-muted block">Identity provider UUID</span>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            RBAC Role
          </span>
          <span className="font-bold text-lg text-text-default block truncate">
            {session?.role || userRole}
          </span>
          <span className="text-[11px] text-text-muted block">Matrix security tier</span>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            Directory Groups
          </span>
          <span className="font-mono font-bold text-lg text-text-default block">
            {session?.groups?.length || currentFullUser?.groups?.length || 2} Assigned
          </span>
          <span className="text-[11px] text-text-muted block">LDAP/SSO synchronized</span>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-500" />
            Session Valid Until
          </span>
          <span className="font-bold text-sm text-text-default block truncate mt-1">
            {expiresDate}
          </span>
          <span className="text-[11px] text-text-muted block">Token auto-refresh active</span>
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* 4. NAVIGATION TABS */}
      {/* ----------------------------------------------------------------------- */}
      <div className="flex items-center gap-2 border-b border-border pb-px overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap",
            activeTab === "overview"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text-default"
          )}
        >
          <UserIcon className="w-4 h-4" />
          <span>Identity & Directory Scopes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("permissions")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap",
            activeTab === "permissions"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text-default"
          )}
        >
          <Shield className="w-4 h-4" />
          <span>Role Privileges & SoD</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("activity")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap",
            activeTab === "activity"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text-default"
          )}
        >
          <Calendar className="w-4 h-4" />
          <span>Recent Activity & Audits</span>
        </button>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* 5. TAB CONTENT */}
      {/* ----------------------------------------------------------------------- */}

      {/* TAB A: OVERVIEW & DIRECTORY SCOPES */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Personal & Workspace Info */}
          <div className="lg:col-span-6 space-y-5">
            <Card className="p-5 bg-surface border border-border rounded-xl space-y-4">
              <h3 className="text-sm font-bold text-text-default uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-primary" />
                Personal Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-text-muted block text-[11px]">Full Legal Name</span>
                  <span className="font-semibold text-text-default">{session?.name || currentFullUser?.name}</span>
                </div>

                <div>
                  <span className="text-text-muted block text-[11px]">Official Email</span>
                  <span className="font-mono text-text-default">{session?.email || currentFullUser?.email}</span>
                </div>

                <div>
                  <span className="text-text-muted block text-[11px]">Job Title / Designation</span>
                  <span className="font-medium text-text-default">{session?.title || currentFullUser?.title || "Principal Engineer"}</span>
                </div>

                <div>
                  <span className="text-text-muted block text-[11px]">Security Clearance</span>
                  <span className="font-medium text-emerald-500 font-semibold">Level 4 (Elevated Operations)</span>
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-surface border border-border rounded-xl space-y-4">
              <h3 className="text-sm font-bold text-text-default uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Enterprise Organization & Workspace
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-text-muted block text-[11px]">Organization / Tenant</span>
                  <span className="font-semibold text-text-default">{session?.tenantName || activeTenant}</span>
                </div>

                <div>
                  <span className="text-text-muted block text-[11px]">Tenant Identifier</span>
                  <span className="font-mono text-text-default">{session?.tenantId || "CMP_1001_ZENDEV"}</span>
                </div>

                <div>
                  <span className="text-text-muted block text-[11px]">System Domain</span>
                  <span className="font-mono text-text-default">{session?.tenantDomain || "zendev.zenops.io"}</span>
                </div>

                <div>
                  <span className="text-text-muted block text-[11px]">Data Boundary</span>
                  <span className="font-semibold text-text-default flex items-center gap-1.5 text-success">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    Strict Multi-Tenant Isolation
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Directory Groups & Scoped Services */}
          <div className="lg:col-span-6 space-y-5">
            <Card className="p-5 bg-surface border border-border rounded-xl space-y-4">
              <h3 className="text-sm font-bold text-text-default uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" />
                Assigned Directory Groups (LDAP / Okta)
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Resource access constraints in ZenOps CMDB are enforced based on these active directory group memberships.
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                {(session?.groups || currentFullUser?.groups || ["CMDB-Admins", "Platform-Eng"]).map((grp) => (
                  <span
                    key={grp}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sunken border border-border text-text-default flex items-center gap-1.5 shadow-2xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {grp}
                  </span>
                ))}
              </div>
            </Card>

            <Card className="p-5 bg-surface border border-border rounded-xl space-y-4">
              <h3 className="text-sm font-bold text-text-default uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-500" />
                Authorized Service Domains
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Business services and critical infrastructure tiers this persona is authorized to operate upon.
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                {(session?.services || currentFullUser?.services || ["Core Infrastructure", "Payment Processing", "Customer Web Portal"]).map(
                  (svc) => (
                    <span
                      key={svc}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 border border-primary/20 text-primary flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {svc}
                    </span>
                  )
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB B: RBAC PERMISSIONS & PRIVILEGES */}
      {activeTab === "permissions" && (
        <div className="space-y-5">
          <Card className="p-5 bg-surface border border-border rounded-xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-bold text-text-default flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Active Role Governance & Separation of Duties (SoD)
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Granular capabilities granted by role <strong>{session?.role || userRole}</strong>
                </p>
              </div>

              <Link href="/settings/security/matrix">
                <Button size="sm" variant="outline" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                  Inspect Full RBAC Matrix
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
              <div className="p-3.5 rounded-lg bg-sunken/60 border border-border space-y-1">
                <span className="text-[11px] font-bold text-text-default flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  CI Inventory Read / View
                </span>
                <p className="text-[11px] text-text-muted">
                  Granted to view all active, operational, and retired Configuration Items.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-sunken/60 border border-border space-y-1">
                <span className="text-[11px] font-bold text-text-default flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  Topology Blast Radius Graph
                </span>
                <p className="text-[11px] text-text-muted">
                  Access to 5-tier directional dependency mapping and upstream change risk.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-sunken/60 border border-border space-y-1">
                <span className="text-[11px] font-bold text-text-default flex items-center gap-1.5">
                  {userRole === "Auditor" || userRole === "Service Desk Agent" || userRole === "Executive / Report Viewer" ? (
                    <ShieldAlert className="w-4 h-4 text-warning" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  )}
                  CI Write & Modification
                </span>
                <p className="text-[11px] text-text-muted">
                  {userRole === "Auditor" || userRole === "Executive / Report Viewer"
                    ? "Restricted: Read-only access enforced by policy."
                    : "Granted: Authorized to create and edit configuration attributes."}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-sunken/60 border border-border space-y-1">
                <span className="text-[11px] font-bold text-text-default flex items-center gap-1.5">
                  {userRole === "CMDB Administrator" ? (
                    <ShieldAlert className="w-4 h-4 text-danger" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  )}
                  Data Quality Approval (SoD)
                </span>
                <p className="text-[11px] text-text-muted">
                  {userRole === "CMDB Administrator"
                    ? "Blocked by SoD: Administrators cannot approve data fixes to prevent self-approval."
                    : "Allowed: Data Stewards & Managers can approve quality remediation tasks."}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-sunken/60 border border-border space-y-1">
                <span className="text-[11px] font-bold text-text-default flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  Audit Trail Logging
                </span>
                <p className="text-[11px] text-text-muted">
                  All user actions are cryptographically sealed in the immutable audit log.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-sunken/60 border border-border space-y-1">
                <span className="text-[11px] font-bold text-text-default flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  Attestation Review
                </span>
                <p className="text-[11px] text-text-muted">
                  Participate in quarterly compliance attestation verification campaigns.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB D: RECENT USER ACTIVITY & AUDITS */}
      {activeTab === "activity" && (
        <Card className="p-5 bg-surface border border-border rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-default uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Recent Actions Logged by {session?.name || "Sarah Jenkins"}
            </h3>
            <span className="text-xs text-text-muted font-mono">{userActivities.length} recent events</span>
          </div>

          {userActivities.length === 0 ? (
            <div className="p-8 text-center bg-sunken/40 rounded-xl border border-dashed border-border space-y-2">
              <Calendar className="w-8 h-8 text-text-muted mx-auto" />
              <p className="text-sm font-medium text-text-default">No recent audit logs for this persona</p>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                Actions you perform (such as editing CIs, retiring assets, approving relationships, or completing tasks) will appear here in chronological order.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border bg-sunken/50 text-text-secondary font-semibold">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Target CI</th>
                    <th className="py-2.5 px-3">Field Changed</th>
                    <th className="py-2.5 px-3">Change Record</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {userActivities.map((act: CIAuditHistory) => (
                    <tr key={act.id} className="hover:bg-sunken/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-text-muted whitespace-nowrap">
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                          {act.changeType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-text-default">
                        {act.ciName} <span className="text-text-muted font-mono text-[10px]">({act.ciId})</span>
                      </td>
                      <td className="py-2.5 px-3 text-text-secondary">
                        <span className="font-mono text-[11px]">{act.fieldChanged}</span>: {act.afterValue}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-primary">
                        {act.changeRecord || "Automated System"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* 6. EDIT PROFILE MODAL */}
      {/* ----------------------------------------------------------------------- */}
      {isEditModalOpen && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Profile Information"
          description="Update your legal display name and platform job title"
          maxWidth="md"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4 p-5 sm:p-6 text-xs">
            <div>
              <label className="block font-semibold text-text-default mb-1.5">
                Full Display Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-sunken border border-border text-text-default text-xs focus:border-primary focus:outline-none"
                placeholder="Your full name..."
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-text-default mb-1.5">
                Job Title / Position
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-sunken border border-border text-text-default text-xs focus:border-primary focus:outline-none"
                placeholder="Your engineering position..."
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-text-default mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={session?.email || "sarah.jenkins@gmail.com"}
                disabled
                className="w-full p-2.5 rounded-lg bg-sunken/50 border border-border text-text-muted text-xs cursor-not-allowed"
              />
              <span className="text-[10px] text-text-muted mt-1 block">
                Official enterprise email managed by identity directory.
              </span>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" variant="primary">
                Save Profile Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
