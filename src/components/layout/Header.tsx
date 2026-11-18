"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Bell,
  Plus,
  Menu,
  ChevronDown,
  Building2,
  Lock,
  Layers,
  Shield,
  Check,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Lozenge } from "@/components/ui/Lozenge";
import { Avatar } from "@/components/ui/Avatar";
import { Breadcrumbs, BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { CommandPalette } from "./CommandPalette";
import { useCMDB, AVAILABLE_TENANTS, UserRole } from "@/context/cmdb-context";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  collapsed: boolean;
}

const ENVIRONMENTS = [
  "All",
  "Production",
  "Staging/QA",
  "Test",
  "Development",
  "DR",
];

const ALL_HUMAN_ROLES: UserRole[] = [
  "CMDB Administrator",
  "CMDB Manager",
  "Data Steward",
  "Discovery / Integration Admin",
  "CI Owner",
  "Service Owner",
  "Service Desk Agent",
  "Change Manager",
  "Incident / Problem Analyst",
  "Auditor",
  "Executive / Report Viewer",
  "Break-glass Administrator" as any,
];

export function Header({ onOpenMobileSidebar, collapsed }: HeaderProps) {
  const rawPathname = usePathname();
  const pathname = rawPathname || "";
  const router = useRouter();
  const {
    dataQualityTasks,
    attestationCampaigns,
    userRole,
    setUserRole,
    activeTenant,
    setActiveTenant,
    selectedEnvironment,
    setSelectedEnvironment,
    canEdit,
    session,
    availableTenants,
    logout,
  } = useCMDB();

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [tenantOpen, setTenantOpen] = useState(false);
  const [envOpen, setEnvOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const tenantRef = useRef<HTMLDivElement>(null);
  const envRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tenantRef.current && !tenantRef.current.contains(e.target as Node)) {
        setTenantOpen(false);
      }
      if (envRef.current && !envRef.current.contains(e.target as Node)) {
        setEnvOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute breadcrumbs trail
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0 || segments[0] === "dashboard") {
      return [{ label: "CMDB", href: "/dashboard" }, { label: "Health Dashboard" }];
    }

    const crumbs: BreadcrumbItem[] = [{ label: "CMDB", href: "/dashboard" }];

    if (segments[0] === "cis") {
      crumbs.push({ label: "Configuration Items", href: "/cis" });
      if (segments[1] === "new") {
        crumbs.push({ label: "New CI" });
      } else if (segments[1] && segments[2] === "edit") {
        crumbs.push({ label: segments[1], href: `/cis/${segments[1]}` });
        crumbs.push({ label: "Edit" });
      } else if (segments[1]) {
        crumbs.push({ label: segments[1] });
      }
    } else if (segments[0] === "services") {
      crumbs.push({ label: "Business Services", href: "/services" });
    } else if (segments[0] === "relationships") {
      crumbs.push({ label: "CI Relationships & Topology", href: "/relationships" });
    } else if (segments[0] === "discovery-sources") {
      crumbs.push({ label: "Discovery Sources", href: "/discovery-sources" });
    } else if (segments[0] === "staging") {
      crumbs.push({ label: "Raw Discovery Staging", href: "/staging" });
    } else if (segments[0] === "reconciliation-rules") {
      crumbs.push({ label: "Reconciliation Rules", href: "/reconciliation-rules" });
    } else if (segments[0] === "ire-console") {
      crumbs.push({ label: "IRE Simulator Console", href: "/ire-console" });
    } else if (segments[0] === "data-quality") {
      crumbs.push({ label: "Data Quality Tasks", href: "/data-quality" });
    } else if (segments[0] === "attestation-campaigns") {
      crumbs.push({ label: "Attestation Campaigns", href: "/attestation-campaigns" });
    } else if (segments[0] === "audit-history") {
      crumbs.push({ label: "CI Audit History", href: "/audit-history" });
    } else if (segments[0] === "getting-started") {
      crumbs.push({ label: "Getting Started Checklist", href: "/getting-started" });
    } else if (segments[0] === "settings") {
      crumbs.push({ label: "Settings" });
      if (segments[1] === "classes") crumbs.push({ label: "Class Hierarchy" });
      else if (segments[1] === "trust-score") crumbs.push({ label: "Trust Score Weights" });
      else if (segments[1] === "roles") crumbs.push({ label: "RBAC Matrix" });
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const pendingDQCount = dataQualityTasks.filter((t) => t.status === "Pending").length;

  return (
    <>
      <header className="sticky top-0 z-30 h-14 bg-surface border-b border-border dark:border-white/[0.07] px-3 sm:px-5 lg:px-6 flex items-center justify-between shadow-subtle dark:shadow-none w-full text-default">
        {/* Left Section: Mobile Menu, Breadcrumbs & Tenant Isolation Indicator */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobileSidebar}
            className="p-1.5 -ml-1.5 rounded-button text-secondary hover:text-default hover:bg-sunken lg:hidden"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb Path */}
          <Breadcrumbs items={breadcrumbs} className="hidden md:flex" />

          {/* Tenant Isolation Lock Chip */}
          <div
            className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lozenge bg-sunken border border-border/80 dark:border-white/[0.08] text-xs font-medium text-secondary"
            title={`Tenant isolation active: ${activeTenant}`}
          >
            <Lock className="w-3.5 h-3.5 text-primary" />
            <span className="truncate max-w-[140px] font-semibold text-default">{activeTenant}</span>
            <span className="text-[11px] text-muted">Isolated</span>
          </div>
        </div>

        {/* Right Section: Command Search, Create CI, Tenant Switcher, Env Filter, Theme, Notifs, Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Cmd+K Search Trigger */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-2 bg-sunken hover:bg-border/60 dark:hover:bg-white/[0.05] text-secondary hover:text-default px-2.5 sm:px-3 py-1.5 rounded-input border border-border dark:border-white/[0.08] text-sm transition-colors shadow-2xs group"
            title="Search CIs, records, and navigation (Cmd+K)"
          >
            <Search className="w-4 h-4 text-muted group-hover:text-default" />
            <span className="hidden sm:inline text-sm text-muted">Search or jump to...</span>
            <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-xs font-mono text-muted bg-surface rounded border border-border/80 dark:border-white/[0.08]">
              ⌘K
            </kbd>
          </button>

          
          {/* Tenant / Company Switcher */}
          <div ref={tenantRef} className="relative">
            <button
              type="button"
              onClick={() => setTenantOpen(!tenantOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-button hover:bg-sunken text-sm font-semibold text-secondary hover:text-default transition-colors border border-transparent hover:border-border dark:hover:border-white/[0.08]"
              title="Switch Active Tenant"
            >
              <Building2 className="w-4 h-4 text-primary" />
              <span className="hidden lg:inline truncate max-w-[120px]">
                {availableTenants.find((t) => t.name === activeTenant)?.shortName || activeTenant}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-muted" />
            </button>

            {tenantOpen && (
              <div className="absolute right-0 mt-1.5 w-64 bg-surface border border-border dark:border-white/[0.1] rounded-card shadow-dropdown p-1.5 z-50 text-sm animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-border dark:border-white/[0.06] mb-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">Active Tenant</p>
                  <p className="text-sm font-bold text-default">{activeTenant}</p>
                  <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                    <Lock className="w-3 h-3 text-primary" /> Data isolated to this workspace
                  </p>
                </div>

                <div className="space-y-0.5">
                  {availableTenants.map((t) => {
                    const isSelected = t.name === activeTenant;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setActiveTenant(t.name);
                          setTenantOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-md flex items-center justify-between text-sm transition-colors",
                          isSelected ? "bg-selected text-primary font-semibold" : "hover:bg-sunken text-default"
                        )}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="truncate font-medium">{t.name}</p>
                          <p className="text-xs font-mono text-muted">{t.domain}</p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Environment Filter */}
          <div ref={envRef} className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => setEnvOpen(!envOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-button hover:bg-sunken text-sm font-medium text-secondary hover:text-default transition-colors border border-transparent hover:border-border"
              title="Filter by Environment"
            >
              <Layers className="w-4 h-4 text-secondary" />
              <span className="truncate max-w-[90px]">{selectedEnvironment}</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted" />
            </button>

            {envOpen && (
              <div className="absolute right-0 mt-1.5 w-44 bg-surface border border-border rounded-card shadow-dropdown p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted border-b border-border mb-1">
                  Environment Scope
                </div>
                {ENVIRONMENTS.map((env) => {
                  const isSelected = env === selectedEnvironment;
                  return (
                    <button
                      key={env}
                      type="button"
                      onClick={() => {
                        setSelectedEnvironment(env);
                        setEnvOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded-[3px] flex items-center justify-between text-xs transition-colors",
                        isSelected ? "bg-selected text-primary font-semibold" : "hover:bg-sunken text-default"
                      )}
                    >
                      <span>{env}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Theme Toggle (Light / Dark / System) */}
          <ThemeToggle />

          {/* Notifications Popover */}
          <div ref={notifRef} className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen(!notifOpen)}
              className="p-1.5 rounded-button text-secondary hover:text-default hover:bg-sunken transition-colors relative"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {pendingDQCount > 0 && (
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-warning"></span>
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-1.5 w-80 sm:w-88 bg-surface border border-border rounded-card shadow-dropdown p-0 z-50 text-sm animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                <div className="px-3.5 py-2.5 border-b border-border bg-sunken/60 flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-default text-sm">CMDB Governance Alerts</h5>
                    <p className="text-xs text-muted">Automated discovery feeds</p>
                  </div>
                  {pendingDQCount > 0 && (
                    <Lozenge variant="warning" size="sm">
                      {pendingDQCount} Action Required
                    </Lozenge>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-border">
                  {dataQualityTasks.slice(0, 3).map((task) => (
                    <div key={task.id} className="p-3 hover:bg-sunken/50 transition-colors">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-default truncate text-sm">{task.issueType}</p>
                          <p className="text-xs text-muted truncate">
                            Target: <span className="font-bold text-default">{task.ciName}</span> ({task.ciId})
                          </p>
                          <Link
                            href="/data-quality"
                            onClick={() => setNotifOpen(false)}
                            className="text-xs font-semibold text-primary hover:underline mt-1 inline-block"
                          >
                            Resolve Task →
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}

                  {attestationCampaigns.filter((c) => c.outcome === "In Progress").slice(0, 1).map((camp) => (
                    <div key={camp.id} className="p-3 hover:bg-sunken/50 transition-colors">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-default truncate text-sm">{camp.name}</p>
                          <p className="text-xs text-muted">{camp.completionPercentage}% certified</p>
                          <Link
                            href="/attestation-campaigns"
                            onClick={() => setNotifOpen(false)}
                            className="text-xs font-semibold text-primary hover:underline mt-1 inline-block"
                          >
                            Open Campaign →
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-2.5 border-t border-border bg-sunken/40 text-center">
                  <Link
                    href="/data-quality"
                    onClick={() => setNotifOpen(false)}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    View All Governance Tasks →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile & Role Switcher */}
          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-1.5 p-1 rounded-button hover:bg-sunken transition-colors"
              aria-label="User menu"
            >
              <Avatar name={session?.name || "Sarah Jenkins"} size="sm" presence="online" />
              <ChevronDown className="w-3.5 h-3.5 text-muted hidden sm:block" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-1.5 w-64 bg-surface border border-border rounded-card shadow-dropdown p-2.5 z-50 text-sm animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-2 border-b border-border">
                  <p className="font-bold text-default text-sm truncate">{session?.name || "Sarah Jenkins"}</p>
                  <p className="text-xs text-muted truncate">{session?.email || "sarah.jenkins@gmail.com"}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <Lozenge variant="info" size="sm">
                      {userRole}
                    </Lozenge>
                    <span className="text-xs text-muted truncate max-w-[120px]">
                      {session?.title || "Platform Eng"}
                    </span>
                  </div>
                </div>

                {/* Role Switcher Matrix */}
                <div className="py-2 border-b border-border">
                  <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-muted mb-1 flex items-center justify-between">
                    <span>View as role (Demo)</span>
                    <span className="text-[9px] text-primary font-normal">12 Roles</span>
                  </p>
                  <div className="space-y-0.5 max-h-56 overflow-y-auto scrollbar-thin pr-1">
                    {ALL_HUMAN_ROLES.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          setUserRole(role);
                          setProfileOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-2.5 py-1.5 rounded-[3px] flex items-center justify-between text-xs transition-colors",
                          userRole === role ? "bg-selected text-primary font-semibold" : "hover:bg-sunken text-default"
                        )}
                      >
                        <span className="truncate pr-2">{role}</span>
                        {userRole === role && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-1.5 space-y-0.5 text-secondary">
                  <Link
                    href="/getting-started"
                    onClick={() => setProfileOpen(false)}
                    className="block px-2.5 py-1.5 rounded-[3px] hover:bg-sunken text-default transition-colors text-xs"
                  >
                    Getting Started Checklist
                  </Link>
                  <Link
                    href="/settings/roles"
                    onClick={() => setProfileOpen(false)}
                    className="block px-2.5 py-1.5 rounded-[3px] hover:bg-sunken text-default transition-colors text-xs"
                  >
                    RBAC Permission Matrix
                  </Link>

                  {/* Sign out action */}
                  <div className="pt-1 border-t border-border/80">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-[3px] text-xs font-semibold text-danger hover:bg-danger/10 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </>
  );
}
