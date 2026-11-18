"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  Users,
  Clock,
  Cpu,
  Scale,
  Activity,
  Grid,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SECURITY_TABS = [
  {
    name: "System Roles",
    href: "/settings/security/roles",
    icon: Shield,
    exact: false,
  },
  {
    name: "Directory Groups",
    href: "/settings/security/group-mapping",
    icon: Users,
    exact: false,
  },
  {
    name: "Temporary Access (JIT)",
    href: "/settings/security/temporary-access",
    icon: Clock,
    exact: false,
  },
  {
    name: "Service Accounts",
    href: "/settings/security/service-accounts",
    icon: Cpu,
    exact: false,
  },
  {
    name: "SoD Policy Rules",
    href: "/settings/security/policy-rules",
    icon: Scale,
    exact: false,
  },
  {
    name: "Access Audit & Alerts",
    href: "/settings/security/access-audit",
    icon: Activity,
    exact: false,
  },
  {
    name: "Permission Matrix",
    href: "/settings/security/matrix",
    icon: Grid,
    exact: false,
  },
];

export function SecurityNav() {
  const pathname = usePathname() || "";

  return (
    <div className="border-b border-border bg-surface px-4 sm:px-6">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-2">
        {SECURITY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all",
                isActive
                  ? "bg-selected text-primary border border-primary/20 shadow-xs"
                  : "text-secondary hover:text-default hover:bg-sunken border border-transparent"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", isActive ? "text-primary" : "text-muted")} />
              <span>{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
