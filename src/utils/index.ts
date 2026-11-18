import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind and conditional class names safely without style conflicts.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats an ISO date-time string into a human-readable format.
 * Example: "Nov 12, 2026, 04:30 PM"
 */
export function formatDateTime(isoString: string): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

/**
 * Formats an ISO date string into a date format.
 * Example: "Nov 12, 2026"
 */
export function formatDate(isoString: string): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}

/**
 * Calculates human-readable relative time (e.g. "5 mins ago", "2 hours ago").
 */
export function timeAgo(isoString: string): string {
  if (!isoString) return "—";
  try {
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return formatDate(isoString);
  } catch {
    return isoString;
  }
}

/**
 * Returns color tokens and status labels based on CMDB Trust Score (0 - 100%).
 */
export function getTrustScoreColor(score: number): {
  bg: string;
  text: string;
  border: string;
  barColor: string;
  label: string;
} {
  if (score >= 90) {
    return {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      barColor: "bg-[#55DDB0]",
      label: "Excellent",
    };
  }
  if (score >= 75) {
    return {
      bg: "bg-blue-50",
      text: "text-[#3478E8]",
      border: "border-blue-200",
      barColor: "bg-[#3478E8]",
      label: "Good",
    };
  }
  if (score >= 60) {
    return {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      barColor: "bg-amber-500",
      label: "Moderate",
    };
  }
  return {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    barColor: "bg-rose-500",
    label: "At Risk",
  };
}

/**
 * Returns color tokens for Business Criticality tiers.
 */
export function getCriticalityColor(criticality: string): {
  bg: string;
  text: string;
  border: string;
} {
  if (criticality.includes("Tier 0") || criticality.includes("Tier 1")) {
    return { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" };
  }
  if (criticality.includes("Tier 2")) {
    return { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" };
  }
  if (criticality.includes("Tier 3")) {
    return { bg: "bg-blue-50", text: "text-[#3478E8]", border: "border-blue-200" };
  }
  return { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200" };
}

/**
 * Returns color tokens and status dot styles for real-time Operational Statuses.
 */
export function getOperationalStatusColor(status: string): {
  bg: string;
  text: string;
  dot: string;
} {
  switch (status) {
    case "Operational":
      return { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-[#55DDB0]" };
    case "Degraded":
      return { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" };
    case "Maintenance":
      return { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500" };
    case "Non-operational":
    case "Offline":
    case "Down":
      return { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" };
    default:
      return { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400" };
  }
}

/**
 * Returns color tokens for asset Lifecycle Stages.
 */
export function getLifecycleStatusColor(status: string): {
  bg: string;
  text: string;
} {
  switch (status) {
    case "In Use":
    case "Live":
      return { bg: "bg-emerald-50 text-emerald-700", text: "text-emerald-700" };
    case "In Test":
    case "In Build":
      return { bg: "bg-sky-50 text-sky-700", text: "text-sky-700" };
    case "Maintenance":
      return { bg: "bg-purple-50 text-purple-700", text: "text-purple-700" };
    case "Retired":
    case "Disposed":
      return { bg: "bg-slate-100 text-slate-500", text: "text-slate-500" };
    default:
      return { bg: "bg-blue-50 text-[#3478E8]", text: "text-[#3478E8]" };
  }
}

/**
 * Triggers client-side download of data as a JSON or CSV file.
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
