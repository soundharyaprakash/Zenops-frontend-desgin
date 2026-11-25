"use client";

import React from "react";
import { User, Cloud, Cpu, Zap, Key, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActorChipProps {
  name: string;
  role?: string;
  type?: "person" | "connector" | "engine" | "automation" | "service_account";
  approvedBy?: string;
  className?: string;
}

/**
 * Standard Actor Chip (Phase 0, Item 0.9 & G11)
 *
 * Icon by type (person, connector, engine, automation, service account),
 * full name, and secondary role text.
 */
export const ActorChip: React.FC<ActorChipProps> = ({
  name,
  role,
  type = "person",
  approvedBy,
  className,
}) => {
  // Infer type if not specified
  const resolvedType =
    type ||
    (name.toLowerCase().includes("connector")
      ? "connector"
      : name.toLowerCase().includes("engine") || name.toLowerCase().includes("ire")
      ? "engine"
      : name.toLowerCase().includes("service account") || name.toLowerCase().includes("bot")
      ? "service_account"
      : "person");

  const icons = {
    person: User,
    connector: Cloud,
    engine: Cpu,
    automation: Zap,
    service_account: Key,
  };

  const IconComponent = icons[resolvedType] || User;

  return (
    <div className={cn("inline-flex flex-col text-left text-xs", className)}>
      <div className="flex items-center gap-1.5 font-medium text-default">
        <IconComponent className="w-3.5 h-3.5 text-muted shrink-0" />
        <span className="truncate max-w-[180px]">{name}</span>
      </div>
      {role && <span className="text-[10px] text-muted truncate max-w-[180px]">{role}</span>}
      {approvedBy && (
        <span className="text-[10px] text-primary/80 font-mono mt-0.5">
          Appr: {approvedBy}
        </span>
      )}
    </div>
  );
};
