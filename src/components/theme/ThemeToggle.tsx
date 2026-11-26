"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Laptop } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  variant?: "icon" | "dropdown";
}

export function ThemeToggle({ className, variant = "icon" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("w-8 h-8 rounded-[3px] bg-sunken animate-pulse", className)} />
    );
  }

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const getLabel = () => {
    if (theme === "dark") return "Dark theme";
    if (theme === "light") return "Light theme";
    return "System theme";
  };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className={cn(
        "p-1.5 rounded-button text-secondary hover:text-default hover:bg-sunken transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center justify-center",
        className
      )}
      title={`Theme: ${getLabel()} (Click to toggle)`}
      aria-label={`Toggle theme, currently ${getLabel()}`}
    >
      {theme === "dark" ? (
        <Moon className="w-4 h-4 text-warning" />
      ) : theme === "light" ? (
        <Sun className="w-4 h-4 text-amber-500" />
      ) : (
        <Laptop className="w-4 h-4 text-secondary" />
      )}
    </button>
  );
}
