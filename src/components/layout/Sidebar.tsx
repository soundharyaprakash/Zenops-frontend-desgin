"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  Network,
  Radio,
  GitMerge,
  ShieldCheck,
  CheckCircle2,
  History,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Layers,
  Terminal,
  Settings,
  Sliders,
  Shield,
  Lock,
  ChevronDown,
  Sparkles,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Lozenge } from "@/components/ui/Lozenge";
import { useCMDB } from "@/context/cmdb-context";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: any;
  active: boolean;
  highlight?: boolean;
  badge?: number | string;
  badgeVariant?: "success" | "warning" | "danger" | "info" | "neutral";
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const rawPathname = usePathname();
  const pathname = rawPathname || "";
  const { dataQualityTasks, discoverySources, activeTenant } = useCMDB();
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  const pendingDQCount = dataQualityTasks.filter((t) => t.status === "Pending").length;
  const activeSourcesCount = discoverySources.filter((s) => s.status === "Active").length;

  // Jira-style Grouped Navigation Structure
  const navSections: NavSection[] = [
    {
      title: "Overview",
      items: [
        {
          name: "Getting Started",
          href: "/getting-started",
          icon: Sparkles,
          active: pathname === "/getting-started",
          highlight: true,
        },
        {
          name: "Health Dashboard",
          href: "/dashboard",
          icon: LayoutDashboard,
          active: pathname === "/dashboard" || pathname === "/",
        },
      ],
    },
    {
      title: "Asset & Service Registry",
      items: [
        {
          name: "Configuration Items",
          href: "/cis",
          icon: Boxes,
          active: pathname.startsWith("/cis"),
        },
        {
          name: "Business Services",
          href: "/services",
          icon: Briefcase,
          active: pathname.startsWith("/services"),
        },
        {
          name: "Relationships & Graph",
          href: "/relationships",
          icon: Network,
          active: pathname === "/relationships",
        },
      ],
    },
    {
      title: "Discovery & Reconciliation",
      items: [
        {
          name: "Discovery Sources",
          href: "/discovery-sources",
          icon: Radio,
          active: pathname.startsWith("/discovery-sources"),
          badge: activeSourcesCount,
          badgeVariant: "success" as const,
        },
        {
          name: "Reconciliation Rules",
          href: "/reconciliation-rules",
          icon: GitMerge,
          active: pathname.startsWith("/reconciliation-rules"),
        },
      ],
    },
    {
      title: "Governance & Attestation",
      items: [
        {
          name: "Data Quality Tasks",
          href: "/data-quality",
          icon: ShieldCheck,
          active: pathname.startsWith("/data-quality"),
          badge: pendingDQCount > 0 ? pendingDQCount : undefined,
          badgeVariant: "warning" as const,
        },
        {
          name: "Attestation Campaigns",
          href: "/attestation-campaigns",
          icon: CheckCircle2,
          active: pathname.startsWith("/attestation-campaigns"),
        },
        {
          name: "Immutable Audit History",
          href: "/audit-history",
          icon: History,
          active: pathname.startsWith("/audit-history"),
        },
      ],
    },
  ];

  // Advanced Tools Group (Collapsed by default for mid-size / startup simplicity)
  const advancedItems = [
    {
      name: "Raw Discovery Staging",
      href: "/staging",
      icon: Layers,
      active: pathname.startsWith("/staging"),
    },
    {
      name: "IRE Test Console",
      href: "/ire-console",
      icon: Terminal,
      active: pathname.startsWith("/ire-console"),
    },
    {
      name: "Class Hierarchy Designer",
      href: "/settings/classes",
      icon: Settings,
      active: pathname.startsWith("/settings/classes"),
    },
    {
      name: "Trust Score Weights",
      href: "/settings/trust-score",
      icon: Sliders,
      active: pathname.startsWith("/settings/trust-score"),
    },
    {
      name: "Security & Access",
      href: "/settings/security/roles",
      icon: Shield,
      active: pathname.startsWith("/settings/security"),
    },
    {
      name: "RBAC Permissions Matrix",
      href: "/settings/roles",
      icon: ShieldCheck,
      active: pathname.startsWith("/settings/roles"),
    },
  ];

  const isAnyAdvancedActive = advancedItems.some((item) => item.active);

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-surface border-r border-border dark:border-white/[0.07] transition-all duration-200 ease-in-out shadow-subtle select-none text-default",
          collapsed ? "w-16" : "w-64 xl:w-72",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Top Logo Header */}
        <div className="h-14 flex items-center justify-between gap-1.5 px-3 py-2 border-b border-border dark:border-white/[0.07] bg-surface transition-colors">
          <div className="flex-1 min-w-0">
            <Logo collapsed={collapsed} size="sm" />
          </div>
          {/* Mobile Close Button */}
          {mobileOpen && (
            <button
              onClick={onCloseMobile}
              className="flex lg:hidden p-1.5 rounded-button text-muted hover:text-default hover:bg-sunken transition-colors flex-shrink-0"
              aria-label="Close Navigation"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          {!collapsed && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1 rounded-button text-muted hover:text-default hover:bg-sunken transition-colors flex-shrink-0"
              title="Collapse Sidebar"
              aria-label="Collapse Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Collapsed Expand Trigger */}
        {collapsed && (
          <div className="hidden lg:flex justify-center py-2 border-b border-border dark:border-white/[0.07] bg-surface">
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded-button text-muted hover:text-default hover:bg-sunken transition-colors"
              title="Expand Sidebar"
              aria-label="Expand Sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Content */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-0.5">
              {!collapsed && (
                <div className="px-3 py-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    {section.title}
                  </span>
                </div>
              )}

              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 group relative active:scale-[0.99]",
                      item.active
                        ? "bg-selected text-primary font-semibold shadow-2xs"
                        : "text-secondary hover:text-default hover:bg-sunken",
                      item.highlight && !item.active && "text-brand-blue font-semibold",
                      collapsed && "justify-center px-0 py-2.5"
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    {/* Active Indicator Accent Bar */}
                    {item.active && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-primary rounded-r" />
                    )}

                    <Icon
                      className={cn(
                        "w-4 h-4 flex-shrink-0 transition-all duration-200 group-hover:scale-110",
                        item.active
                          ? "text-primary"
                          : item.highlight
                          ? "text-brand-blue"
                          : "text-muted group-hover:text-default"
                      )}
                    />

                    {!collapsed && (
                      <span className="truncate flex-1 tracking-tight leading-none">
                        {item.name}
                      </span>
                    )}

                    {!collapsed && item.badge !== undefined && (
                      <Lozenge variant={item.badgeVariant} size="sm">
                        {item.badge}
                      </Lozenge>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}

          {/* Advanced Group (Collapsible for Startup Simplicity) */}
          <div className="pt-2 border-t border-border/60 space-y-0.5">
            {!collapsed ? (
              <button
                type="button"
                onClick={() => setAdvancedExpanded(!advancedExpanded)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted hover:text-default transition-colors"
              >
                <span>Advanced CMDB Modules</span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 transition-transform",
                    (advancedExpanded || isAnyAdvancedActive) && "transform rotate-180"
                  )}
                />
              </button>
            ) : null}

            {(advancedExpanded || isAnyAdvancedActive || collapsed) && (
              <div className="space-y-0.5 animate-in fade-in duration-100">
                {advancedItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onCloseMobile}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors group relative",
                        item.active
                          ? "bg-selected text-primary font-semibold shadow-2xs"
                          : "text-secondary hover:text-default hover:bg-sunken",
                        collapsed && "justify-center px-0 py-2.5"
                      )}
                      title={collapsed ? item.name : undefined}
                    >
                      {item.active && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-primary rounded-r" />
                      )}

                      <Icon
                        className={cn(
                          "w-4 h-4 flex-shrink-0 transition-colors",
                          item.active ? "text-primary" : "text-muted group-hover:text-default"
                        )}
                      />

                      {!collapsed && (
                        <span className="truncate flex-1 tracking-tight leading-none">
                          {item.name}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Pinned Tenant Isolation Footer */}
        <div className="p-2.5 border-t border-border bg-sunken/40">
          {!collapsed ? (
            <div className="p-2 rounded-md bg-surface border border-border flex items-center gap-2.5 shadow-2xs">
              <div className="w-7 h-7 rounded bg-sunken flex items-center justify-center text-primary flex-shrink-0">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-default truncate leading-tight">
                  {activeTenant}
                </p>
                <p className="text-[11px] text-muted flex items-center gap-1.5 mt-0.5 leading-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  Tenant Isolated
                </p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div
                className="w-8 h-8 rounded-md bg-surface border border-border flex items-center justify-center text-primary shadow-2xs"
                title={`Tenant Isolation Active: ${activeTenant}`}
              >
                <Lock className="w-4 h-4" />
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
