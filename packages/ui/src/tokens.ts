/**
 * Design Tokens: Single Source of Truth for Tensorcade.
 *
 * Visual aesthetic: Dark retro-futuristic computational laboratory.
 * Specifications derived from docs/03-art-direction.md:
 * - Obsidian base background (#0B0F17)
 * - Neon phosphor accents with WCAG AAA / AA contrast (>= 7:1 against base)
 * - 16px integer tile scale & spacing grid
 * - 1.250 Major Third modular typography scale
 * - Tactile motion & transition curves
 */

export const colors = {
  bg: {
    base: '#0B0F17',
    surface: '#151C28',
  },
  border: {
    subtle: '#232E42',
  },
  text: {
    primary: '#F8FAFC',
    muted: '#94A3B8',
    dim: '#64748B',
  },
  accent: {
    cyan: '#38BDF8',
    amber: '#F59E0B',
    emerald: '#10B981',
    crimson: '#FB7185',
    indigo: '#A5B4FC',
  },
} as const;

export type ColorTokens = typeof colors;

export const highContrastColors = {
  bg: {
    base: '#000000',
    surface: '#0A0F18',
  },
  border: {
    subtle: '#64748B',
  },
  text: {
    primary: '#FFFFFF',
    muted: '#E2E8F0',
    dim: '#94A3B8',
  },
  accent: {
    cyan: '#7DD3FC',
    amber: '#FBBF24',
    emerald: '#34D399',
    crimson: '#FDA4AF',
    indigo: '#C7D2FE',
  },
} as const;

export const pixelGrid = {
  baseTilePx: 16,
  integerScales: [1, 2, 3, 4] as const,
  maxDpr: 2.0,
} as const;

export const spacing = {
  0: '0rem', // 0px
  1: '0.25rem', // 4px (1/4 base tile)
  2: '0.5rem', // 8px (1/2 base tile)
  3: '0.75rem', // 12px (3/4 base tile)
  4: '1rem', // 16px (1x base tile)
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px (1.5x base tile)
  8: '2rem', // 32px (2x base tile)
  10: '2.5rem', // 40px
  12: '3rem', // 48px (3x base tile)
  16: '4rem', // 64px (4x base tile)
  20: '5rem', // 80px (5x base tile)
  24: '6rem', // 96px (6x base tile)
} as const;

export type SpacingTokens = typeof spacing;

export const typography = {
  fonts: {
    mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
    sans: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },
  scale: {
    display: {
      fontSize: '2.441rem',
      lineHeight: '1.15',
      letterSpacing: '-0.025em',
      fontWeight: '700',
    },
    h1: {
      fontSize: '1.953rem',
      lineHeight: '1.2',
      letterSpacing: '-0.020em',
      fontWeight: '600',
    },
    h2: {
      fontSize: '1.563rem',
      lineHeight: '1.25',
      letterSpacing: '-0.015em',
      fontWeight: '600',
    },
    h3: {
      fontSize: '1.250rem',
      lineHeight: '1.3',
      letterSpacing: '-0.010em',
      fontWeight: '600',
    },
    base: {
      fontSize: '1.000rem',
      lineHeight: '1.5',
      letterSpacing: '0em',
      fontWeight: '400',
    },
    sm: {
      fontSize: '0.800rem',
      lineHeight: '1.4',
      letterSpacing: '0.010em',
      fontWeight: '400',
    },
    mono: {
      fontSize: '0.875rem',
      lineHeight: '1.45',
      letterSpacing: '0em',
      fontWeight: '400',
    },
    metric: {
      fontSize: '0.750rem',
      lineHeight: '1.2',
      letterSpacing: '0.050em',
      fontWeight: '600',
    },
  },
} as const;

export type TypographyTokens = typeof typography;

export const motion = {
  tick: '100ms linear',
  uiSnap: '150ms cubic-bezier(0.16, 1, 0.3, 1)',
  pulse: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  cam: '400ms cubic-bezier(0.25, 1, 0.5, 1)',
} as const;

export type MotionTokens = typeof motion;

export const radii = {
  none: '0px',
  sm: '2px',
  md: '4px',
  lg: '8px',
  full: '9999px',
} as const;

export type RadiiTokens = typeof radii;

export const focusRing = {
  outline: '2px solid #38BDF8',
  outlineOffset: '2px',
  boxShadow: '0 0 0 2px #38BDF8, 0 0 0 4px #0B0F17',
} as const;

export const zIndex = {
  base: 0,
  surface: 1,
  dropdown: 20,
  sticky: 30,
  drawer: 40,
  modal: 50,
  popover: 60,
  tooltip: 60,
  toast: 70,
  max: 9999,
} as const;

export type ZIndexTokens = typeof zIndex;

/**
 * WCAG 2.2 Relative Luminance and Contrast Ratio calculation helpers.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const sanitized = hex.replace('#', '').trim();
  const fullHex =
    sanitized.length === 3
      ? sanitized
          .split('')
          .map((c) => c + c)
          .join('')
      : sanitized;
  const num = parseInt(fullHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (c: number): number => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const rL = toLinear(r);
  const gL = toLinear(g);
  const bL = toLinear(b);
  return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
}

export function contrastRatio(hex1: string, hex2: string): number {
  const lum1 = relativeLuminance(hex1);
  const lum2 = relativeLuminance(hex2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

export const tokens = {
  colors,
  pixelGrid,
  spacing,
  typography,
  motion,
  radii,
  focusRing,
  zIndex,
} as const;

export default tokens;
