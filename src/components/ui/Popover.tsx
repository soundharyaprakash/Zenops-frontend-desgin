"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface PopoverProps {
  trigger: React.ReactNode;
  content: React.ReactNode;
  align?: "left" | "right" | "center";
  width?: string;
  className?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Popover({
  trigger,
  content,
  align = "left",
  width = "w-72",
  className,
  isOpen: controlledOpen,
  onOpenChange,
}: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = (val: boolean) => {
    if (!isControlled) setUncontrolledOpen(val);
    onOpenChange?.(val);
  };

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const alignClasses = {
    left: "left-0",
    right: "right-0",
    center: "left-1/2 -translate-x-1/2",
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <div onClick={() => setOpen(!open)} className="cursor-pointer inline-flex">
        {trigger}
      </div>

      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1.5 bg-surface border border-border rounded-card shadow-dropdown p-3 animate-in fade-in zoom-in-95 duration-100",
            alignClasses[align],
            width,
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
