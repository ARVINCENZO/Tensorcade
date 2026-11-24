// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ModeSwitcher } from './ModeSwitcher.js';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('ModeSwitcher (Sub-step 5b.4)', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
      root = null;
    }
    if (container) {
      container.remove();
      container = null;
    }
  });

  describe('Static markup and WAI-ARIA conformance', () => {
    it('renders role="tablist" with aria-label="Editor Play Mode"', () => {
      const html = renderToStaticMarkup(
        <ModeSwitcher currentMode="explorer" onModeChange={() => {}} />,
      );

      expect(html).toContain('role="tablist"');
      expect(html).toContain('aria-label="Editor Play Mode"');
    });

    it('renders all three modes when supportedModes is omitted', () => {
      const html = renderToStaticMarkup(
        <ModeSwitcher currentMode="explorer" onModeChange={() => {}} />,
      );

      expect(html).toContain('Explorer');
      expect(html).toContain('Builder');
      expect(html).toContain('Hacker');
      expect(html).toContain('Blocks');
      expect(html).toContain('Parsons');
      expect(html).toContain('Python');
    });

    it('filters visible tabs when supportedModes is specified', () => {
      const html = renderToStaticMarkup(
        <ModeSwitcher
          currentMode="hacker"
          supportedModes={['explorer', 'hacker']}
          onModeChange={() => {}}
        />,
      );

      expect(html).toContain('Explorer');
      expect(html).toContain('Hacker');
      expect(html).not.toContain('Builder');
      expect(html).not.toContain('Parsons');
    });

    it('returns null and renders nothing when supportedModes contains only 1 mode', () => {
      const html = renderToStaticMarkup(
        <ModeSwitcher currentMode="hacker" supportedModes={['hacker']} onModeChange={() => {}} />,
      );

      expect(html).toBe('');
    });

    it('sets aria-selected="true" on currentMode tab and "false" on inactive tabs', () => {
      const html = renderToStaticMarkup(
        <ModeSwitcher currentMode="builder" onModeChange={() => {}} />,
      );

      expect(html).toMatch(/data-mode="builder"[^>]*aria-selected="true"/);
      expect(html).toMatch(/data-mode="explorer"[^>]*aria-selected="false"/);
      expect(html).toMatch(/data-mode="hacker"[^>]*aria-selected="false"/);
    });
  });

  describe('Interactive Tab Selection and Keyboard Navigation', () => {
    it('calls onModeChange when an inactive mode tab is clicked', () => {
      const handleModeChange = vi.fn();

      act(() => {
        root?.render(<ModeSwitcher currentMode="explorer" onModeChange={handleModeChange} />);
      });

      const builderTab = container?.querySelector<HTMLButtonElement>('[data-mode="builder"]');
      expect(builderTab).toBeDefined();

      act(() => {
        builderTab?.click();
      });

      expect(handleModeChange).toHaveBeenCalledTimes(1);
      expect(handleModeChange).toHaveBeenCalledWith('builder');
    });

    it('does NOT call onModeChange when the already selected tab is clicked', () => {
      const handleModeChange = vi.fn();

      act(() => {
        root?.render(<ModeSwitcher currentMode="explorer" onModeChange={handleModeChange} />);
      });

      const explorerTab = container?.querySelector<HTMLButtonElement>('[data-mode="explorer"]');
      act(() => {
        explorerTab?.click();
      });

      expect(handleModeChange).not.toHaveBeenCalled();
    });

    it('does NOT call onModeChange when disabled', () => {
      const handleModeChange = vi.fn();

      act(() => {
        root?.render(
          <ModeSwitcher currentMode="explorer" disabled={true} onModeChange={handleModeChange} />,
        );
      });

      const hackerTab = container?.querySelector<HTMLButtonElement>('[data-mode="hacker"]');
      act(() => {
        hackerTab?.click();
      });

      expect(handleModeChange).not.toHaveBeenCalled();
    });

    it('navigates to next tab on ArrowRight keydown', () => {
      const handleModeChange = vi.fn();

      act(() => {
        root?.render(<ModeSwitcher currentMode="explorer" onModeChange={handleModeChange} />);
      });

      const tablist = container?.querySelector<HTMLDivElement>('[role="tablist"]');
      expect(tablist).toBeDefined();

      act(() => {
        tablist?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      });

      expect(handleModeChange).toHaveBeenCalledWith('builder');
    });

    it('navigates to previous tab on ArrowLeft keydown (wrapping around to last tab)', () => {
      const handleModeChange = vi.fn();

      act(() => {
        root?.render(<ModeSwitcher currentMode="explorer" onModeChange={handleModeChange} />);
      });

      const tablist = container?.querySelector<HTMLDivElement>('[role="tablist"]');

      act(() => {
        tablist?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      });

      expect(handleModeChange).toHaveBeenCalledWith('hacker');
    });

    it('navigates to first tab on Home and last tab on End', () => {
      const handleModeChange = vi.fn();

      act(() => {
        root?.render(<ModeSwitcher currentMode="builder" onModeChange={handleModeChange} />);
      });

      const tablist = container?.querySelector<HTMLDivElement>('[role="tablist"]');

      act(() => {
        tablist?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
      });
      expect(handleModeChange).toHaveBeenCalledWith('explorer');

      act(() => {
        tablist?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      });
      expect(handleModeChange).toHaveBeenCalledWith('hacker');
    });
  });
});
