"use client";

import React, { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  badge?: string | number;
}

interface TabsContextType {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (val: string) => void;
  // Backward compatibility with array-based usage
  tabs?: TabItem[];
  activeTab?: string;
  onChange?: (id: string) => void;
  variant?: "underline" | "pills";
  children?: React.ReactNode;
  className?: string;
}

export function Tabs({
  defaultValue = "",
  value,
  onValueChange,
  tabs,
  activeTab: propActiveTab,
  onChange,
  variant = "underline",
  children,
  className,
}: TabsProps) {
  const [internalTab, setInternalTab] = useState(defaultValue || (tabs && tabs[0]?.id) || "");
  const currentTab = propActiveTab !== undefined ? propActiveTab : value !== undefined ? value : internalTab;

  const handleSelect = (id: string) => {
    if (value === undefined && propActiveTab === undefined) setInternalTab(id);
    onValueChange?.(id);
    onChange?.(id);
  };

  // If array of tabs is provided directly (legacy / simple view pattern)
  if (tabs && tabs.length > 0 && !children) {
    return (
      <div className={cn("w-full overflow-x-auto", className)}>
        <div
          role="tablist"
          className={cn(
            "flex items-center space-x-1",
            variant === "underline"
              ? "border-b border-border"
              : "bg-elevated p-1 rounded-md border border-border"
          )}
        >
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleSelect(tab.id)}
                className={cn(
                  "px-3.5 py-2 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap select-none",
                  variant === "underline"
                    ? isActive
                      ? "text-primary border-b-2 border-primary font-semibold -mb-px"
                      : "text-secondary hover:text-foreground border-b-2 border-transparent -mb-px"
                    : isActive
                    ? "bg-surface text-foreground font-semibold shadow-subtle rounded"
                    : "text-secondary hover:text-foreground rounded"
                )}
              >
                {tab.icon && <span className="w-4 h-4 flex items-center">{tab.icon}</span>}
                <span>{tab.label}</span>
                {(tab.count !== undefined || tab.badge !== undefined) && (
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-mono font-medium",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "bg-elevated text-muted"
                    )}
                  >
                    {tab.count ?? tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <TabsContext.Provider value={{ activeTab: currentTab, setActiveTab: handleSelect }}>
      <div className={cn("w-full space-y-3", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  children,
  className,
  variant = "underline",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "underline" | "pills";
}) {
  return (
    <div
      className={cn(
        "flex items-center overflow-x-auto",
        variant === "underline"
          ? "border-b border-border space-x-1"
          : "bg-elevated p-1 rounded-md border border-border space-x-1",
        className
      )}
      role="tablist"
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className,
  count,
  disabled,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
  count?: number;
  disabled?: boolean;
}) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");

  const isActive = context.activeTab === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => context.setActiveTab(value)}
      className={cn(
        "px-3.5 py-2 text-sm font-medium transition-colors flex items-center gap-2 select-none relative -mb-px disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap",
        isActive
          ? "text-primary border-b-2 border-primary font-semibold"
          : "text-secondary hover:text-foreground border-b-2 border-transparent",
        className
      )}
    >
      <span>{children}</span>
      {count !== undefined && (
        <span
          className={cn(
            "text-xs px-2 py-0.5 rounded-full font-mono font-medium",
            isActive
              ? "bg-primary/10 text-primary"
              : "bg-elevated text-muted"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within Tabs");

  if (context.activeTab !== value) return null;

  return (
    <div role="tabpanel" className={cn("focus:outline-none animate-in fade-in duration-100", className)}>
      {children}
    </div>
  );
}
