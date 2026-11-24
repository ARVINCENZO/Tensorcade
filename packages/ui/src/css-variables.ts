import { colors, focusRing, motion, radii, spacing, typography, zIndex } from './tokens.js';

export const cssVariables = {
  // Backgrounds
  '--tc-bg-base': colors.bg.base,
  '--tc-bg-surface': colors.bg.surface,

  // Borders
  '--tc-border-subtle': colors.border.subtle,

  // Text
  '--tc-text-primary': colors.text.primary,
  '--tc-text-muted': colors.text.muted,
  '--tc-text-dim': colors.text.dim,

  // Accents
  '--tc-accent-cyan': colors.accent.cyan,
  '--tc-accent-amber': colors.accent.amber,
  '--tc-accent-emerald': colors.accent.emerald,
  '--tc-accent-crimson': colors.accent.crimson,
  '--tc-accent-indigo': colors.accent.indigo,

  // Fonts
  '--tc-font-mono': typography.fonts.mono,
  '--tc-font-sans': typography.fonts.sans,

  // Focus
  '--tc-focus-outline': focusRing.outline,
  '--tc-focus-outline-offset': focusRing.outlineOffset,
  '--tc-focus-box-shadow': focusRing.boxShadow,

  // Transitions
  '--tc-motion-tick': motion.tick,
  '--tc-motion-ui-snap': motion.uiSnap,
  '--tc-motion-pulse': motion.pulse,
  '--tc-motion-cam': motion.cam,

  // Radii
  '--tc-radius-none': radii.none,
  '--tc-radius-sm': radii.sm,
  '--tc-radius-md': radii.md,
  '--tc-radius-lg': radii.lg,
  '--tc-radius-full': radii.full,

  // Spacing (Base 16px tile scale)
  '--tc-spacing-0': spacing[0],
  '--tc-spacing-1': spacing[1],
  '--tc-spacing-2': spacing[2],
  '--tc-spacing-3': spacing[3],
  '--tc-spacing-4': spacing[4],
  '--tc-spacing-5': spacing[5],
  '--tc-spacing-6': spacing[6],
  '--tc-spacing-8': spacing[8],
  '--tc-spacing-10': spacing[10],
  '--tc-spacing-12': spacing[12],
  '--tc-spacing-16': spacing[16],
  '--tc-spacing-20': spacing[20],
  '--tc-spacing-24': spacing[24],

  // Z-Index
  '--tc-z-base': String(zIndex.base),
  '--tc-z-surface': String(zIndex.surface),
  '--tc-z-dropdown': String(zIndex.dropdown),
  '--tc-z-sticky': String(zIndex.sticky),
  '--tc-z-drawer': String(zIndex.drawer),
  '--tc-z-modal': String(zIndex.modal),
  '--tc-z-popover': String(zIndex.popover),
  '--tc-z-tooltip': String(zIndex.tooltip),
  '--tc-z-toast': String(zIndex.toast),
  '--tc-z-max': String(zIndex.max),
} as const;

export function generateCssVariablesString(): string {
  const lines = Object.entries(cssVariables).map(([key, value]) => `  ${key}: ${value};`);
  return `:root {\n${lines.join('\n')}\n}\n`;
}
