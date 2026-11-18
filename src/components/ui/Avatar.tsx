"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
  src?: string;
  size?: "xs" | "sm" | "md" | "lg";
  presence?: "online" | "busy" | "offline";
  title?: string;
}

// Generate deterministic Atlassian-style avatar color palette
function getAvatarColor(name: string) {
  const colors = [
    "bg-sky-600 text-white",
    "bg-indigo-600 text-white",
    "bg-emerald-600 text-white",
    "bg-teal-600 text-white",
    "bg-amber-600 text-white",
    "bg-purple-600 text-white",
    "bg-rose-600 text-white",
    "bg-slate-700 text-white",
  ];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name = "User",
  src,
  size = "sm",
  presence,
  className,
  title,
  ...props
}: AvatarProps) {
  const sizeClasses = {
    xs: "w-5 h-5 text-[9px]",
    sm: "w-6 h-6 text-[10px]",
    md: "w-8 h-8 text-xs",
    lg: "w-10 h-10 text-sm",
  };

  const colorClass = getAvatarColor(name);
  const initials = getInitials(name);

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-full font-bold select-none flex-shrink-0 shadow-2xs",
        sizeClasses[size],
        !src && colorClass,
        className
      )}
      title={title || name}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <span>{initials}</span>
      )}

      {presence && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full ring-2 ring-surface",
            size === "xs" && "w-1.5 h-1.5",
            size === "sm" && "w-2 h-2",
            size === "md" && "w-2.5 h-2.5",
            size === "lg" && "w-3 h-3",
            presence === "online" && "bg-success",
            presence === "busy" && "bg-danger",
            presence === "offline" && "bg-muted"
          )}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
