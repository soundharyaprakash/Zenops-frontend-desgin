/**
 * Single Score-Band Configuration (Phase 0, Item 0.5)
 *
 * Unified threshold definition used everywhere across the platform:
 * - Healthy: >= 80 (Target met)
 * - At risk: 60 - 79 (Below target)
 * - Critical: < 60 (Below target)
 *
 * Ad-hoc thresholds (e.g. marking 74 as Healthy) are strictly forbidden.
 */

export interface ScoreBand {
  min: number;
  max: number;
  key: "HEALTHY" | "AT_RISK" | "CRITICAL";
  label: "Healthy" | "At risk" | "Critical";
  targetLabel: "Target met" | "Below target";
  color: string;
  badgeVariant: "success" | "warning" | "danger";
  textColor: string;
  bgColor: string;
  borderClass: string;
}

export const SCORE_BANDS: Record<"HEALTHY" | "AT_RISK" | "CRITICAL", ScoreBand> = {
  HEALTHY: {
    min: 80,
    max: 100,
    key: "HEALTHY",
    label: "Healthy",
    targetLabel: "Target met",
    color: "#1F845A",
    badgeVariant: "success",
    textColor: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10 dark:bg-emerald-500/15",
    borderClass: "border-emerald-500/30",
  },
  AT_RISK: {
    min: 60,
    max: 79,
    key: "AT_RISK",
    label: "At risk",
    targetLabel: "Below target",
    color: "#D97706",
    badgeVariant: "warning",
    textColor: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-500/10 dark:bg-amber-500/15",
    borderClass: "border-amber-500/30",
  },
  CRITICAL: {
    min: 0,
    max: 59,
    key: "CRITICAL",
    label: "Critical",
    targetLabel: "Below target",
    color: "#DC2626",
    badgeVariant: "danger",
    textColor: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-500/10 dark:bg-red-500/15",
    borderClass: "border-red-500/30",
  },
};

/**
 * Returns the canonical score band for any given score (0-100).
 */
export function getScoreBand(score: number): ScoreBand {
  const s = Math.round(score);
  if (s >= 80) return SCORE_BANDS.HEALTHY;
  if (s >= 60) return SCORE_BANDS.AT_RISK;
  return SCORE_BANDS.CRITICAL;
}

/**
 * Returns target compliance status.
 * Replaces legacy SLA terminology with "Target met" vs "Below target".
 */
export function getScoreTargetStatus(score: number): {
  label: "Target met" | "Below target";
  variant: "success" | "danger";
} {
  return score >= 80
    ? { label: "Target met", variant: "success" }
    : { label: "Below target", variant: "danger" };
}
