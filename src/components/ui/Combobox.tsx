"use client";

import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select option...",
  label,
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  className,
  disabled = false,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = search.trim()
    ? options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(search.toLowerCase()) ||
          opt.value.toLowerCase().includes(search.toLowerCase()) ||
          opt.description?.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  return (
    <div ref={containerRef} className={cn("relative w-full space-y-1 text-left", className)}>
      {label && (
        <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary">
          {label}
        </label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center justify-between bg-surface text-default text-xs rounded-input border border-border px-2.5 py-1.5 transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-subtle",
          disabled && "opacity-50 cursor-not-allowed bg-sunken"
        )}
      >
        <span className={cn("truncate", !selectedOption && "text-muted")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronsUpDown className="w-3.5 h-3.5 text-muted shrink-0 ml-1.5" />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-card shadow-dropdown p-1.5 text-xs animate-in fade-in zoom-in-95 duration-100 max-h-64 overflow-hidden flex flex-col">
          {/* Search bar */}
          <div className="relative mb-1">
            <Search className="w-3.5 h-3.5 text-muted absolute left-2 top-2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-sunken rounded-[3px] border border-border/60 pl-7 pr-7 py-1 text-xs text-default placeholder:text-muted focus:outline-none focus:border-primary"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1.5 text-muted hover:text-default"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options list */}
          <div className="overflow-y-auto max-h-48 space-y-0.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-[3px] text-left transition-colors text-xs",
                      isSelected
                        ? "bg-selected text-primary font-semibold"
                        : "hover:bg-sunken text-default"
                    )}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate">{opt.label}</p>
                      {opt.description && (
                        <p className="text-[10px] text-muted truncate">{opt.description}</p>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="py-4 text-center text-xs text-muted">
                {emptyText}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
