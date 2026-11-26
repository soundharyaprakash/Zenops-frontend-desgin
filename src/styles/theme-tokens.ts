/**
 * ZenOps CMDB Central Theme & Design Tokens
 * 
 * Single source of truth for the brand palette, glass/mirror button styling,
 * dark-mode surface elevation, and subtle hairline border tokens.
 *
 * Dominant brand colors extracted from ZenOps logo:
 * - brand-500 (main action): #1F6BFF
 * - brand-400 (light specular): #4B8AFF
 * - brand-600 (dark depth): #1455D9
 * - brand-cyan (accent only): #19C8F0
 * - brand-mint (accent only): #3EF2B5
 */

export const THEME_TOKENS = {
  colors: {
    brand: {
      400: "#4B8AFF",
      500: "#1F6BFF",
      600: "#1455D9",
      cyan: "#19C8F0",
      mint: "#3EF2B5",
      glow: "rgba(31, 107, 255, 0.32)",
      glowStrong: "rgba(31, 107, 255, 0.45)",
      glowCyan: "rgba(25, 200, 240, 0.28)",
      glowMint: "rgba(62, 242, 181, 0.28)",
    },
    elevation: {
      light: {
        base: "#F7F8F9",
        surface: "#FFFFFF",
        raised: "#FFFFFF",
        overlay: "#FFFFFF",
        sunken: "#F1F2F4",
      },
      dark: {
        base: "#0B0F19",
        surface: "#111726",
        raised: "#161F33",
        overlay: "#1C263D",
        sunken: "#080D18",
      },
    },
    borders: {
      light: {
        hairline: "rgba(15, 23, 42, 0.10)",
        hairlineStrong: "rgba(15, 23, 42, 0.18)",
        brandTint: "rgba(31, 107, 255, 0.18)",
      },
      dark: {
        hairline: "rgba(255, 255, 255, 0.08)",
        hairlineStrong: "rgba(255, 255, 255, 0.14)",
        brandTint: "rgba(31, 107, 255, 0.18)",
        glassHairlineTop: "rgba(255, 255, 255, 0.20)",
        glassHairlineBottom: "rgba(255, 255, 255, 0.04)",
      },
    },
    text: {
      light: {
        default: "#070A12",
        secondary: "#334155",
        muted: "#64748B",
      },
      dark: {
        default: "#F8FAFC",
        secondary: "#CBD5E1",
        muted: "#94A3B8",
      },
    },
  },
  borderRadius: {
    button: "12px",
    buttonSm: "10px",
    buttonLg: "14px",
    card: "14px",
    input: "10px",
    pill: "9999px",
  },
  shadows: {
    glass: "0 8px 24px rgba(31, 107, 255, 0.24), 0 1px 2px rgba(0, 0, 0, 0.10)",
    glassHover: "0 12px 28px rgba(31, 107, 255, 0.36), 0 2px 4px rgba(0, 0, 0, 0.15)",
    glassDanger: "0 8px 24px rgba(220, 38, 38, 0.28), 0 1px 2px rgba(0, 0, 0, 0.10)",
    glassDangerHover: "0 12px 28px rgba(220, 38, 38, 0.40), 0 2px 4px rgba(0, 0, 0, 0.15)",
    glassSecondaryLight: "0 2px 8px rgba(15, 23, 42, 0.05), 0 1px 2px rgba(15, 23, 42, 0.03)",
    glassSecondaryDark: "0 4px 16px rgba(0, 0, 0, 0.30), 0 0 12px rgba(31, 107, 255, 0.08)",
  },
  transitions: {
    button: "all 180ms cubic-bezier(0.16, 1, 0.3, 1)",
  },
} as const;

export type ThemeTokens = typeof THEME_TOKENS;
