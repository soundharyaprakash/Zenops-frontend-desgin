"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  Briefcase,
  Radio,
  MoreHorizontal,
} from "lucide-react";
import { useCMDB } from "@/context/cmdb-context";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  onOpenMore: () => void;
}

interface NavTab {
  name: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: (pathname: string) => boolean;
  isAction?: boolean;
  badge?: number | string;
}

export function MobileBottomNav({ onOpenMore }: MobileBottomNavProps) {
  const rawPathname = usePathname();
  const pathname = rawPathname || "";
  const { dataQualityTasks } = useCMDB();

  const pendingDQCount = dataQualityTasks.filter((t) => t.status === "Pending").length;

  const PRIMARY_ROUTES = ["/dashboard", "/cis", "/services", "/discovery-sources"];

  const tabs: NavTab[] = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      isActive: (path) => path === "/" || path === "/dashboard",
    },
    {
      name: "CIs",
      href: "/cis",
      icon: Boxes,
      isActive: (path) => path.startsWith("/cis"),
    },
    {
      name: "Services",
      href: "/services",
      icon: Briefcase,
      isActive: (path) => path.startsWith("/services"),
    },
    {
      name: "Discovery",
      href: "/discovery-sources",
      icon: Radio,
      isActive: (path) => path.startsWith("/discovery-sources"),
    },
    {
      name: "More",
      icon: MoreHorizontal,
      isAction: true,
      badge: pendingDQCount > 0 ? pendingDQCount : undefined,
      isActive: (path) =>
        path !== "/" &&
        !PRIMARY_ROUTES.some((route) => path === route || path.startsWith(route + "/")),
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border lg:hidden shadow-[0_-2px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_-2px_12px_rgba(0,0,0,0.35)] pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.isActive(pathname);

          if (tab.isAction) {
            return (
              <button
                key={tab.name}
                type="button"
                onClick={onOpenMore}
                className={cn(
                  "relative flex flex-col items-center justify-center min-h-[48px] py-1 px-1 transition-colors group select-none active:scale-95 touch-manipulation",
                  active
                    ? "text-primary font-semibold"
                    : "text-secondary hover:text-default"
                )}
                aria-label="Open secondary navigation menu"
              >
                <div className="relative">
                  <div
                    className={cn(
                      "p-1 rounded-full transition-all duration-150",
                      active ? "bg-primary/10 text-primary" : "group-hover:bg-sunken text-muted group-hover:text-default"
                    )}
                  >
                    <Icon className="w-5 h-5 transition-transform duration-150 group-active:scale-90" />
                  </div>
                  {tab.badge !== undefined && (
                    <span className="absolute -top-1 -right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-warning text-[10px] font-bold text-white font-mono shadow-xs">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[11px] leading-tight mt-0.5 tracking-tight truncate max-w-[64px]">
                  {tab.name}
                </span>
                {active && (
                  <span className="absolute bottom-1 w-6 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          }

          return (
            <Link
              key={tab.name}
              href={tab.href!}
              className={cn(
                "relative flex flex-col items-center justify-center min-h-[48px] py-1 px-1 transition-colors group select-none active:scale-95 touch-manipulation",
                active
                  ? "text-primary font-semibold"
                  : "text-secondary hover:text-default"
              )}
            >
              <div
                className={cn(
                  "p-1 rounded-full transition-all duration-150",
                  active ? "bg-primary/10 text-primary" : "group-hover:bg-sunken text-muted group-hover:text-default"
                )}
              >
                <Icon className="w-5 h-5 transition-transform duration-150 group-active:scale-90" />
              </div>
              <span className="text-[11px] leading-tight mt-0.5 tracking-tight truncate max-w-[64px]">
                {tab.name}
              </span>
              {active && (
                <span className="absolute bottom-1 w-6 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
