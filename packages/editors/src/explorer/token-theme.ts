import * as Blockly from 'blockly';
import { colors, typography } from '@tensorcade/ui';

/**
 * Tensorcade Dark Theme for Blockly workspace, flyout, and categories.
 * Strict token compliance:
 * - #0B0F17 workspace background
 * - #111827 flyout & toolbox background
 * - Token category accent hues
 * - JetBrains Mono typography
 */
export const tensorcadeDarkTheme = Blockly.Theme.defineTheme('tensorcade-dark', {
  name: 'tensorcade-dark',
  base: Blockly.Themes.Classic,
  blockStyles: {
    game_blocks: {
      colourPrimary: colors.accent.cyan,
      colourSecondary: '#0284C7',
      colourTertiary: '#0369A1',
    },
    loop_blocks: {
      colourPrimary: colors.accent.emerald,
      colourSecondary: '#059669',
      colourTertiary: '#047857',
    },
    logic_blocks: {
      colourPrimary: colors.accent.amber,
      colourSecondary: '#D97706',
      colourTertiary: '#B45309',
    },
    math_blocks: {
      colourPrimary: colors.accent.indigo,
      colourSecondary: '#818CF8',
      colourTertiary: '#6366F1',
    },
    variable_blocks: {
      colourPrimary: colors.accent.crimson,
      colourSecondary: '#F43F5E',
      colourTertiary: '#E11D48',
    },
  },
  categoryStyles: {
    game_category: {
      colour: colors.accent.cyan,
    },
    loop_category: {
      colour: colors.accent.emerald,
    },
    logic_category: {
      colour: colors.accent.amber,
    },
    math_category: {
      colour: colors.accent.indigo,
    },
    variable_category: {
      colour: colors.accent.crimson,
    },
  },
  componentStyles: {
    workspaceBackgroundColour: '#0B0F17',
    toolboxBackgroundColour: '#111827',
    toolboxForegroundColour: colors.text.primary,
    flyoutBackgroundColour: '#111827',
    flyoutForegroundColour: colors.text.primary,
    flyoutOpacity: 1,
    scrollbarColour: colors.border.subtle,
    scrollbarOpacity: 0.8,
    insertionMarkerColour: colors.accent.cyan,
    insertionMarkerOpacity: 0.8,
    markerColour: colors.accent.cyan,
    cursorColour: colors.accent.cyan,
    selectedGlowColour: colors.accent.cyan,
    replacementGlowColour: colors.accent.amber,
  },
  fontStyle: {
    family: typography.fonts.mono,
    weight: '400',
    size: 12,
  },
  startHats: false,
});

export const tensorcadeBlocklyTheme = tensorcadeDarkTheme;
