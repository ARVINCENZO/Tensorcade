import { colors, motion, radii, spacing, typography, zIndex } from './tokens.js';

/**
 * Tailwind CSS Preset theme configuring tokens for Tensorcade.
 * Exported for apps/web and other frontend packages.
 */
export const tensorcadePreset = {
  theme: {
    extend: {
      colors: {
        'tc-bg-base': colors.bg.base,
        'tc-bg-surface': colors.bg.surface,
        'tc-border-subtle': colors.border.subtle,
        'tc-text-primary': colors.text.primary,
        'tc-text-muted': colors.text.muted,
        'tc-text-dim': colors.text.dim,
        'tc-accent-cyan': colors.accent.cyan,
        'tc-accent-amber': colors.accent.amber,
        'tc-accent-emerald': colors.accent.emerald,
        'tc-accent-crimson': colors.accent.crimson,
        'tc-accent-indigo': colors.accent.indigo,
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'SF Mono', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        'tc-display': [
          typography.scale.display.fontSize,
          {
            lineHeight: typography.scale.display.lineHeight,
            letterSpacing: typography.scale.display.letterSpacing,
            fontWeight: typography.scale.display.fontWeight,
          },
        ],
        'tc-h1': [
          typography.scale.h1.fontSize,
          {
            lineHeight: typography.scale.h1.lineHeight,
            letterSpacing: typography.scale.h1.letterSpacing,
            fontWeight: typography.scale.h1.fontWeight,
          },
        ],
        'tc-h2': [
          typography.scale.h2.fontSize,
          {
            lineHeight: typography.scale.h2.lineHeight,
            letterSpacing: typography.scale.h2.letterSpacing,
            fontWeight: typography.scale.h2.fontWeight,
          },
        ],
        'tc-h3': [
          typography.scale.h3.fontSize,
          {
            lineHeight: typography.scale.h3.lineHeight,
            letterSpacing: typography.scale.h3.letterSpacing,
            fontWeight: typography.scale.h3.fontWeight,
          },
        ],
        'tc-base': [
          typography.scale.base.fontSize,
          {
            lineHeight: typography.scale.base.lineHeight,
            letterSpacing: typography.scale.base.letterSpacing,
            fontWeight: typography.scale.base.fontWeight,
          },
        ],
        'tc-sm': [
          typography.scale.sm.fontSize,
          {
            lineHeight: typography.scale.sm.lineHeight,
            letterSpacing: typography.scale.sm.letterSpacing,
            fontWeight: typography.scale.sm.fontWeight,
          },
        ],
        'tc-mono': [
          typography.scale.mono.fontSize,
          {
            lineHeight: typography.scale.mono.lineHeight,
            letterSpacing: typography.scale.mono.letterSpacing,
            fontWeight: typography.scale.mono.fontWeight,
          },
        ],
        'tc-metric': [
          typography.scale.metric.fontSize,
          {
            lineHeight: typography.scale.metric.lineHeight,
            letterSpacing: typography.scale.metric.letterSpacing,
            fontWeight: typography.scale.metric.fontWeight,
          },
        ],
      },
      spacing: {
        'tc-0': spacing[0],
        'tc-1': spacing[1],
        'tc-2': spacing[2],
        'tc-3': spacing[3],
        'tc-4': spacing[4],
        'tc-5': spacing[5],
        'tc-6': spacing[6],
        'tc-8': spacing[8],
        'tc-10': spacing[10],
        'tc-12': spacing[12],
        'tc-16': spacing[16],
        'tc-20': spacing[20],
        'tc-24': spacing[24],
      },
      borderRadius: {
        'tc-none': radii.none,
        'tc-sm': radii.sm,
        'tc-md': radii.md,
        'tc-lg': radii.lg,
        'tc-full': radii.full,
      },
      transitionDuration: {
        'tc-tick': motion.tick.split(' ')[0] ?? '100ms',
        'tc-ui-snap': motion.uiSnap.split(' ')[0] ?? '150ms',
        'tc-pulse': motion.pulse.split(' ')[0] ?? '300ms',
        'tc-cam': motion.cam.split(' ')[0] ?? '400ms',
      },
      transitionTimingFunction: {
        'tc-ui-snap': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'tc-pulse': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'tc-cam': 'cubic-bezier(0.25, 1, 0.5, 1)',
      },
      zIndex: {
        'tc-base': String(zIndex.base),
        'tc-surface': String(zIndex.surface),
        'tc-dropdown': String(zIndex.dropdown),
        'tc-sticky': String(zIndex.sticky),
        'tc-drawer': String(zIndex.drawer),
        'tc-modal': String(zIndex.modal),
        'tc-popover': String(zIndex.popover),
        'tc-tooltip': String(zIndex.tooltip),
        'tc-toast': String(zIndex.toast),
        'tc-max': String(zIndex.max),
      },
    },
  },
} as const;

export default tensorcadePreset;
