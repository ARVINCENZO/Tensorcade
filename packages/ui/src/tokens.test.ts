import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  colors,
  highContrastColors,
  contrastRatio,
  relativeLuminance,
  pixelGrid,
  spacing,
  typography,
  motion,
  radii,
  zIndex,
} from './tokens.js';
import { cssVariables, generateCssVariablesString } from './css-variables.js';
import { tensorcadePreset } from './preset.js';

describe('Design Tokens Specification (docs/03-art-direction.md)', () => {
  const baseBg = colors.bg.base; // #0B0F17

  it('obsidian base background is exactly #0B0F17', () => {
    expect(baseBg).toBe('#0B0F17');
    const lum = relativeLuminance(baseBg);
    // Relative luminance of #0B0F17 is ~0.0051 (documented ~0.0048)
    expect(lum).toBeLessThan(0.01);
  });

  describe('WCAG 2.2 AA / AAA Contrast Verification against #0B0F17', () => {
    it('primary text (#F8FAFC) achieves WCAG AAA (>= 7.0:1)', () => {
      const cr = contrastRatio(colors.text.primary, baseBg);
      expect(cr).toBeGreaterThanOrEqual(18.0); // Documented 18.32:1
    });

    it('muted text (#94A3B8) achieves WCAG AAA (>= 7.0:1)', () => {
      const cr = contrastRatio(colors.text.muted, baseBg);
      expect(cr).toBeGreaterThanOrEqual(7.4); // Documented 7.48:1
    });

    it('dim text (#64748B) achieves WCAG AA for UI / large text (>= 4.0:1)', () => {
      const cr = contrastRatio(colors.text.dim, baseBg);
      expect(cr).toBeGreaterThanOrEqual(4.0); // Documented 4.09:1
    });

    it('cyan accent (#38BDF8) achieves WCAG AAA (>= 7.0:1)', () => {
      const cr = contrastRatio(colors.accent.cyan, baseBg);
      expect(cr).toBeGreaterThanOrEqual(8.8); // Documented 8.91:1
    });

    it('amber accent (#F59E0B) achieves WCAG AAA (>= 7.0:1)', () => {
      const cr = contrastRatio(colors.accent.amber, baseBg);
      expect(cr).toBeGreaterThanOrEqual(8.8); // Documented 8.94:1
    });

    it('emerald accent (#10B981) achieves WCAG AAA (>= 7.0:1)', () => {
      const cr = contrastRatio(colors.accent.emerald, baseBg);
      expect(cr).toBeGreaterThanOrEqual(7.4); // Documented 7.52:1
    });

    it('crimson accent (#FB7185) achieves WCAG AAA (>= 7.0:1)', () => {
      const cr = contrastRatio(colors.accent.crimson, baseBg);
      expect(cr).toBeGreaterThanOrEqual(7.0); // Documented 7.13:1
    });

    it('indigo accent (#A5B4FC) achieves WCAG AAA (>= 7.0:1)', () => {
      const cr = contrastRatio(colors.accent.indigo, baseBg);
      expect(cr).toBeGreaterThanOrEqual(9.5); // Documented 9.76:1
    });
  });

  describe('Pixel-Art & Spacing Scale (16px base tile grid)', () => {
    it('defines base tile grid as 16px with integer scaling', () => {
      expect(pixelGrid.baseTilePx).toBe(16);
      expect(pixelGrid.integerScales).toEqual([1, 2, 3, 4]);
      expect(pixelGrid.maxDpr).toBe(2.0);
    });

    it('spacing scale is based on multiples of 16px tile scale', () => {
      expect(spacing[0]).toBe('0rem');
      expect(spacing[1]).toBe('0.25rem'); // 4px
      expect(spacing[2]).toBe('0.5rem'); // 8px
      expect(spacing[4]).toBe('1rem'); // 16px (1x base tile)
      expect(spacing[8]).toBe('2rem'); // 32px (2x base tile)
      expect(spacing[12]).toBe('3rem'); // 48px (3x base tile)
      expect(spacing[16]).toBe('4rem'); // 64px (4x base tile)
    });
  });

  describe('Typography & Modular Scale (1.250 Major Third)', () => {
    it('defines JetBrains Mono for code and Inter for prose', () => {
      expect(typography.fonts.mono).toContain('JetBrains Mono');
      expect(typography.fonts.sans).toContain('Inter');
    });

    it('implements 1.250 modular type scale', () => {
      expect(typography.scale.display.fontSize).toBe('2.441rem');
      expect(typography.scale.h1.fontSize).toBe('1.953rem');
      expect(typography.scale.h2.fontSize).toBe('1.563rem');
      expect(typography.scale.h3.fontSize).toBe('1.250rem');
      expect(typography.scale.base.fontSize).toBe('1.000rem');
      expect(typography.scale.sm.fontSize).toBe('0.800rem');
      expect(typography.scale.mono.fontSize).toBe('0.875rem');
      expect(typography.scale.metric.fontSize).toBe('0.750rem');
    });
  });

  describe('Motion & Animation Physics', () => {
    it('specifies tactical motion durations and curves', () => {
      expect(motion.tick).toBe('100ms linear');
      expect(motion.uiSnap).toContain('cubic-bezier');
      expect(motion.pulse).toContain('cubic-bezier');
      expect(motion.cam).toContain('cubic-bezier');
    });
  });

  describe('Radii and Z-Index Hierarchy', () => {
    it('provides sharp and subtle radii', () => {
      expect(radii.none).toBe('0px');
      expect(radii.sm).toBe('2px');
      expect(radii.md).toBe('4px');
      expect(radii.lg).toBe('8px');
    });

    it('establishes strict z-index layering', () => {
      expect(zIndex.base).toBeLessThan(zIndex.surface);
      expect(zIndex.surface).toBeLessThan(zIndex.dropdown);
      expect(zIndex.dropdown).toBeLessThan(zIndex.drawer);
      expect(zIndex.drawer).toBeLessThan(zIndex.modal);
      expect(zIndex.modal).toBeLessThan(zIndex.toast);
    });
  });

  describe('CSS Variables and Tailwind Preset Export', () => {
    it('exports CSS variables dictionary', () => {
      expect(cssVariables['--tc-bg-base']).toBe('#0B0F17');
      expect(cssVariables['--tc-accent-cyan']).toBe('#38BDF8');
      expect(cssVariables['--tc-focus-outline']).toBe('2px solid #38BDF8');
    });

    it('generates valid CSS variable root block', () => {
      const cssString = generateCssVariablesString();
      expect(cssString).toContain(':root {');
      expect(cssString).toContain('--tc-bg-base: #0B0F17;');
      expect(cssString).toContain('--tc-accent-cyan: #38BDF8;');
    });

    it('exports valid Tailwind preset with all token mappings', () => {
      expect(tensorcadePreset.theme.extend.colors['tc-bg-base']).toBe('#0B0F17');
      expect(tensorcadePreset.theme.extend.colors['tc-accent-cyan']).toBe('#38BDF8');
      expect(tensorcadePreset.theme.extend.fontFamily.mono[0]).toBe('JetBrains Mono');
      expect(tensorcadePreset.theme.extend.fontFamily.sans[0]).toBe('Inter');
    });
  });

  describe('High-Contrast Theme and Reduced-Motion CSS Rules', () => {
    it('high-contrast text and accents achieve WCAG AAA (>= 7.0:1) against #000000', () => {
      const hcBase = highContrastColors.bg.base;
      expect(contrastRatio(highContrastColors.text.primary, hcBase)).toBeGreaterThanOrEqual(20.0);
      expect(contrastRatio(highContrastColors.text.muted, hcBase)).toBeGreaterThanOrEqual(15.0);
      expect(contrastRatio(highContrastColors.text.dim, hcBase)).toBeGreaterThanOrEqual(7.5);
      expect(contrastRatio(highContrastColors.accent.cyan, hcBase)).toBeGreaterThanOrEqual(10.0);
    });

    it('tokens.css implements [data-theme="high-contrast"] and [data-reduced-motion="true"]', () => {
      const css = readFileSync(resolve(import.meta.dirname, './tokens.css'), 'utf8');
      expect(css).toContain("[data-theme='high-contrast']");
      expect(css).toContain('--tc-bg-base: #000000;');
      expect(css).toContain("[data-reduced-motion='true']");
      expect(css).toContain('transition-duration: 0.01ms !important;');
    });
  });
});
