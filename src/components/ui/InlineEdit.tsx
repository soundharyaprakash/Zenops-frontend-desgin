"use client";

import React, { useState, useRef, useEffect } from "react";
import { Check, X, Pencil, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InlineEditProps {
  value: string;
  onSave: (newValue: string) => Promise<boolean | void> | boolean | void;
  label?: string;
  placeholder?: string;
  type?: "text" | "number" | "select";
  options?: { label: string; value: string }[];
  className?: string;
  disabled?: boolean;
}

export function InlineEdit({
  value,
  onSave,
  label,
  placeholder = "Click to set...",
  type = "text",
  options = [],
  className,
  disabled = false,
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentVal, setCurrentVal] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    setCurrentVal(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleCommit = async () => {
    if (currentVal.trim() === value.trim()) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(currentVal);
      setIsEditing(false);
    } catch {
      // Keep in edit mode on error
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setCurrentVal(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCommit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={cn("inline-flex items-center gap-1.5", className)}>
        {type === "select" ? (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={currentVal}
            onChange={(e) => setCurrentVal(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            className="text-xs bg-surface text-default border border-primary rounded-input px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary shadow-subtle"
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={type}
            value={currentVal}
            onChange={(e) => setCurrentVal(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            className="text-xs bg-surface text-default border border-primary rounded-input px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary shadow-subtle min-w-[140px]"
          />
        )}

        <button
          type="button"
          onClick={handleCommit}
          disabled={isSaving}
          className="p-1 rounded hover:bg-success-bg text-success transition-colors"
          title="Save (Enter)"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={handleCancel}
          disabled={isSaving}
          className="p-1 rounded hover:bg-danger-bg text-danger transition-colors"
          title="Cancel (Esc)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => !disabled && setIsEditing(true)}
      className={cn(
        "group inline-flex items-center gap-1.5 px-1.5 py-0.5 -mx-1.5 rounded transition-all select-none",
        !disabled && "cursor-pointer hover:bg-sunken hover:ring-1 hover:ring-border",
        disabled && "opacity-75 cursor-default",
        className
      )}
      title={disabled ? undefined : "Click to edit inline (Enter to save)"}
    >
      <span className={cn("text-xs font-medium", !value && "text-muted italic")}>
        {value || placeholder}
      </span>
      {!disabled && (
        <Pencil className="w-3 h-3 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
}
