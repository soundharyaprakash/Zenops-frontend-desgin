"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  collapsed?: boolean;
  showTagline?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Logo({
  className,
  collapsed = false,
  showTagline = true,
  size = "sm",
}: LogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : false;

  const heightClasses = {
    sm: "h-7",
    md: "h-8",
    lg: "h-10",
  };

  return (
    <Link
      href="/dashboard"
      className={cn(
        "inline-flex items-center select-none transition-all duration-150 group focus:outline-none",
        collapsed ? "justify-center w-full" : "w-full",
        className
      )}
      aria-label="ZenOps CMDB Home"
    >
      {collapsed ? (
        /* Collapsed Mode: Vector Infinity Mark with brand gradient */
        <div
          className="w-8 h-8 rounded-[4px] bg-surface border border-border flex items-center justify-center p-1 transition-transform group-hover:scale-105 shadow-subtle"
          title="ZenOps Service Management Platform"
        >
          <Image
            src="/brand/zenops-mark.svg"
            alt="ZenOps Mark"
            width={24}
            height={24}
            className="w-full h-full object-contain"
            priority
          />
        </div>
      ) : (
        /* Expanded Mode: Full Logo with Theme-aware Swap */
        <div className="flex items-center">
          {/* Light Mode Logo */}
          <div className={cn("relative items-center", isDark ? "hidden" : "flex")}>
            <Image
              src="/brand/zenops-logo-light.png"
              alt="ZenOps Service Management Platform"
              width={160}
              height={38}
              className={cn("w-auto object-contain transition-opacity duration-150", heightClasses[size])}
              priority
            />
          </div>

          {/* Dark Mode Logo */}
          <div className={cn("relative items-center", isDark ? "flex" : "hidden")}>
            <Image
              src="/brand/zenops-logo-dark.png"
              alt="ZenOps Service Management Platform"
              width={160}
              height={38}
              className={cn("w-auto object-contain transition-opacity duration-150", heightClasses[size])}
              priority
            />
          </div>
        </div>
      )}
    </Link>
  );
}
