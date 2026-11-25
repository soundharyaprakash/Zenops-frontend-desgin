"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Boxes,
  Network,
  Radio,
  GitMerge,
  ShieldCheck,
  CheckCircle2,
  History,
  Plus,
  FileSpreadsheet,
  Sun,
  Moon,
  Laptop,
  ArrowRight,
  Briefcase,
  Layers,
  Terminal,
  Settings,
  Shield,
  Sliders,
  Check,
} from "lucide-react";
import { useCMDB } from "@/context/cmdb-context";
import { useTheme } from "next-themes";
import { Lozenge } from "@/components/ui/Lozenge";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { cis } = useCMDB();
  const { setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset query and focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global key listener for Cmd+K and Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Pages navigation
  const navItems = [
    { name: "Getting Started Checklist", href: "/getting-started", icon: CheckCircle2, category: "Navigation" },
    { name: "CMDB Health Dashboard", href: "/dashboard", icon: LayoutDashboard, category: "Navigation" },
    { name: "Configuration Items Inventory", href: "/cis", icon: Boxes, category: "Navigation" },
    { name: "Business Services Map", href: "/services", icon: Briefcase, category: "Navigation" },
    { name: "CI Relationships & Topology", href: "/relationships", icon: Network, category: "Navigation" },
    { name: "Discovery Connectors & Sources", href: "/discovery-sources", icon: Radio, category: "Navigation" },
    { name: "Raw Discovery Staging", href: "/staging", icon: Layers, category: "Navigation" },
    { name: "Reconciliation Rules & Priority", href: "/reconciliation-rules", icon: GitMerge, category: "Navigation" },
    { name: "IRE Simulator Console", href: "/ire-console", icon: Terminal, category: "Navigation" },
    { name: "Data Quality Tasks & Governance", href: "/data-quality", icon: ShieldCheck, category: "Navigation" },
    { name: "Attestation Campaigns", href: "/attestation-campaigns", icon: CheckCircle2, category: "Navigation" },
    { name: "Immutable CI Audit History Log", href: "/audit-history", icon: History, category: "Navigation" },
    { name: "Settings: Class Hierarchy", href: "/settings/classes", icon: Settings, category: "Settings" },
    { name: "Settings: Trust Score Weights", href: "/settings/trust-score", icon: Sliders, category: "Settings" },
    { name: "Settings: Roles & RBAC Matrix", href: "/settings/security/roles", icon: Shield, category: "Settings" },
  ];

  // Quick Actions
  const actionItems = [
    {
      name: "Create New Configuration Item (Manual)",
      icon: Plus,
      category: "Quick Actions",
      action: () => {
        router.push("/cis/new");
        onClose();
      },
    },
    {
      name: "Bulk Ingest CIs via CSV Spreadsheet",
      icon: FileSpreadsheet,
      category: "Quick Actions",
      action: () => {
        router.push("/cis/new");
        onClose();
      },
    },
    {
      name: "Switch Theme: Dark Mode",
      icon: Moon,
      category: "Preferences",
      action: () => {
        setTheme("dark");
        onClose();
      },
    },
    {
      name: "Switch Theme: Light Mode",
      icon: Sun,
      category: "Preferences",
      action: () => {
        setTheme("light");
        onClose();
      },
    },
    {
      name: "Switch Theme: Match System",
      icon: Laptop,
      category: "Preferences",
      action: () => {
        setTheme("system");
        onClose();
      },
    },
  ];

  // Filtered CIs (matching name, ID, class, owner, IP, MAC, serial, FQDN)
  const q = query.trim().toLowerCase();
  const matchingCIs = q
    ? cis
        .filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.id.toLowerCase().includes(q) ||
            c.ciClass.toLowerCase().includes(q) ||
            c.owner.toLowerCase().includes(q) ||
            c.supportGroup?.toLowerCase().includes(q) ||
            c.attributes?.ipAddress?.includes(q) ||
            c.identificationKeys?.macAddress?.toLowerCase().includes(q) ||
            c.identificationKeys?.fqdn?.toLowerCase().includes(q) ||
            c.identificationKeys?.serialNumber?.toLowerCase().includes(q) ||
            c.serialNumber?.toLowerCase().includes(q) ||
            c.assetTag?.toLowerCase().includes(q)
        )
        .slice(0, 7)
    : [];

  const filteredNav = q
    ? navItems.filter((item) => item.name.toLowerCase().includes(q))
    : navItems.slice(0, 6);

  const filteredActions = q
    ? actionItems.filter((item) => item.name.toLowerCase().includes(q))
    : actionItems.slice(0, 3);

  interface FlatItem {
    id: string;
    type: "ci" | "nav" | "action";
    title: string;
    subtitle?: string;
    badge?: string;
    icon?: any;
    action: () => void;
  }

  const flatList: FlatItem[] = [
    ...matchingCIs.map((c) => ({
      id: `ci-${c.id}`,
      type: "ci" as const,
      title: c.name,
      subtitle: `${c.id} • ${c.ciClass} • ${c.owner}`,
      badge: c.operationalStatus,
      action: () => {
        router.push(`/cis/${c.id}`);
        onClose();
      },
    })),
    ...filteredNav.map((n) => ({
      id: `nav-${n.href}`,
      type: "nav" as const,
      title: n.name,
      icon: n.icon,
      action: () => {
        router.push(n.href);
        onClose();
      },
    })),
    ...filteredActions.map((a, i) => ({
      id: `action-${i}`,
      type: "action" as const,
      title: a.name,
      icon: a.icon,
      action: a.action,
    })),
  ];

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, flatList.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatList.length) % Math.max(1, flatList.length));
    } else if (e.key === "Enter" && flatList[selectedIndex]) {
      e.preventDefault();
      flatList[selectedIndex].action();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 overflow-y-auto animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Palette Container */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-2xl bg-surface border border-border rounded-card shadow-dropdown overflow-hidden z-10 transition-all text-default"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-border gap-3 bg-surface">
          <Search className="w-5 h-5 text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search CIs by ID, name, IP, serial, owner, or navigate screens..."
            className="w-full bg-transparent text-sm text-default placeholder:text-muted focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium text-muted bg-sunken rounded border border-border">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {matchingCIs.length > 0 && (
            <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted">
              Configuration Items ({matchingCIs.length})
            </div>
          )}

          {matchingCIs.map((c, i) => {
            const isSelected = selectedIndex === i;
            return (
              <button
                key={c.id}
                onClick={() => {
                  router.push(`/cis/${c.id}`);
                  onClose();
                }}
                className={cn(
                  "w-full text-left px-3.5 py-2.5 rounded-md flex items-center justify-between text-sm transition-colors",
                  isSelected ? "bg-selected text-primary" : "hover:bg-sunken text-default"
                )}
              >
                <div className="min-w-0 pr-3">
                  <p className="font-semibold truncate text-sm">{c.name}</p>
                  <p className="text-xs font-mono text-muted truncate mt-0.5">
                    {c.id} • {c.ciClass} • {c.owner} {c.attributes?.ipAddress ? `• ${c.attributes.ipAddress}` : ""}
                  </p>
                </div>
                <Lozenge
                  variant={
                    c.operationalStatus === "Operational"
                      ? "success"
                      : c.operationalStatus === "Degraded"
                      ? "warning"
                      : "danger"
                  }
                  size="sm"
                >
                  {c.operationalStatus}
                </Lozenge>
              </button>
            );
          })}

          {filteredNav.length > 0 && (
            <div className="px-3 pt-2.5 pb-1 text-xs font-bold uppercase tracking-wider text-muted">
              Navigation
            </div>
          )}

          {filteredNav.map((item, idx) => {
            const globalIdx = matchingCIs.length + idx;
            const isSelected = selectedIndex === globalIdx;
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                onClick={() => {
                  router.push(item.href);
                  onClose();
                }}
                className={cn(
                  "w-full text-left px-3.5 py-2.5 rounded-md flex items-center justify-between text-sm transition-colors",
                  isSelected ? "bg-selected text-primary font-semibold" : "hover:bg-sunken text-default"
                )}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className="w-4 h-4 text-muted flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted opacity-60" />
              </button>
            );
          })}

          {filteredActions.length > 0 && (
            <div className="px-3 pt-2.5 pb-1 text-xs font-bold uppercase tracking-wider text-muted">
              Quick Actions
            </div>
          )}

          {filteredActions.map((item, idx) => {
            const globalIdx = matchingCIs.length + filteredNav.length + idx;
            const isSelected = selectedIndex === globalIdx;
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={item.action}
                className={cn(
                  "w-full text-left px-3.5 py-2.5 rounded-md flex items-center justify-between text-sm transition-colors",
                  isSelected ? "bg-selected text-primary font-semibold" : "hover:bg-sunken text-default"
                )}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className="w-4 h-4 text-muted flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                </div>
                <span className="text-xs text-muted uppercase font-mono tracking-wider">
                  Action
                </span>
              </button>
            );
          })}

          {flatList.length === 0 && (
            <div className="py-8 text-center text-sm text-muted">
              No matching Configuration Items, routes, or actions for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className="px-4 py-2.5 border-t border-border bg-sunken/60 flex items-center justify-between text-xs text-muted">
          <div className="flex items-center gap-3">
            <span><kbd className="font-mono text-xs bg-surface px-1.5 py-0.5 rounded border border-border">↑</kbd> <kbd className="font-mono text-xs bg-surface px-1.5 py-0.5 rounded border border-border">↓</kbd> to navigate</span>
            <span><kbd className="font-mono text-xs bg-surface px-1.5 py-0.5 rounded border border-border">↵</kbd> to select</span>
          </div>
          <span>ZenOps Command Palette</span>
        </div>
      </div>
    </div>
  );
}
