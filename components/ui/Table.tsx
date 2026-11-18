"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function Table({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto min-w-0 border border-border rounded-lg bg-surface">
      <table
        className={cn("w-full caption-bottom text-sm border-collapse text-left", className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "bg-elevated/70 border-b border-border text-xs font-semibold text-secondary uppercase tracking-wider select-none",
        className
      )}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn("divide-y divide-border/60", className)} {...props}>
      {children}
    </tbody>
  );
}

export function TableFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tfoot
      className={cn("bg-elevated/40 border-t border-border font-medium text-secondary text-xs", className)}
      {...props}
    >
      {children}
    </tfoot>
  );
}

export function TableRow({
  className,
  children,
  selected = false,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement> & { selected?: boolean }) {
  return (
    <tr
      className={cn(
        "transition-colors hover:bg-elevated/50",
        selected && "bg-primary/5",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({
  className,
  children,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "h-9 px-3.5 text-left align-middle font-semibold text-secondary text-xs uppercase tracking-wider whitespace-nowrap",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({
  className,
  children,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("px-3.5 py-3 align-middle text-sm text-foreground", className)}
      {...props}
    >
      {children}
    </td>
  );
}
