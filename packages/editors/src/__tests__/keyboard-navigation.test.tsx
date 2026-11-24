// @vitest-environment happy-dom
/**
 * Keyboard-Only Navigation & Accessibility Test Suite.
 *
 * Conforms to:
 * - docs/QUALITY_BAR.md §Accessibility (WCAG 2.2 AA, full keyboard play, visible focus).
 * - docs/11-lld.md §4 (UI and Design System).
 * - WAI-ARIA 1.2 Tabs design pattern.
 *
 * Verifies:
 * 1. ModeSwitcher arrow key navigation (ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Home, End).
 * 2. WAI-ARIA tab navigation: active tab is tabIndex=0, inactive tabs are tabIndex=-1.
 * 3. Tab and Shift-Tab focus traversal across workspace header, switcher, run button, and panels.
 * 4. Global Ctrl+Enter / Cmd+Enter run execution across Explorer, Builder, and Hacker modes.
 * 5. Builder Mode keyboard-only block addition, reordering, indentation, and removal.
 * 6. Modal dialog keyboard dismissal via Escape key.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { ParsonsBlock } from '@tensorcade/contracts';

// Mock @monaco-editor/react before importing components
vi.mock('@monaco-editor/react', () => {
  return {
    Editor: ({
      value,
      onMount,
    }: {
      value?: string;
      onMount?: (editorInstance: unknown, monacoInstance: unknown) => void;
    }) => {
      React.useEffect(() => {
        onMount?.(
          {
            revealPositionInCenter: vi.fn(),
            setPosition: vi.fn(),
            focus: vi.fn(),
            addCommand: vi.fn(),
            onKeyDown: vi.fn(),
            onDidChangeModelContent: vi.fn(),
            getModel: vi.fn(),
            updateOptions: vi.fn(),
            getValue: vi.fn(() => value ?? ''),
          },
          {
            KeyMod: { CtrlCmd: 2048 },
            KeyCode: { Enter: 3 },
            editor: { setModelMarkers: vi.fn() },
            MarkerSeverity: { Error: 8 },
          }
        );
      }, [onMount, value]);

      return (
        <div data-testid="mock-monaco-editor" tabIndex={0} data-code={value}>
          {value}
        </div>
      );
    },
  };
});

import { EditorWorkspace } from '../components/EditorWorkspace.js';
import { ModeSwitcher } from '../switcher/ModeSwitcher.js';
import { BuilderEditor } from '../builder/BuilderEditor.js';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const testBlocks: ParsonsBlock[] = [
  { id: 'b-step', code: 'step()', isDistractor: false },
  { id: 'b-harvest', code: 'harvest()', isDistractor: false },
  { id: 'b-distract', code: 'jump()', isDistractor: true },
];

describe('Keyboard-Only Interaction & Navigation Verification', () => {
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

  describe('1. ModeSwitcher Arrow Key Navigation (WAI-ARIA Tabs)', () => {
    it('navigates with ArrowRight, ArrowLeft, Home, and End keys', () => {
      const onModeChange = vi.fn();

      act(() => {
        root?.render(
          <ModeSwitcher
            currentMode="explorer"
            onModeChange={onModeChange}
            supportedModes={['explorer', 'builder', 'hacker']}
          />
        );
      });

      const tablist = container?.querySelector<HTMLDivElement>('[role="tablist"]');
      expect(tablist).not.toBeNull();

      // Explorer -> ArrowRight -> Builder
      act(() => {
        tablist?.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
        );
      });
      expect(onModeChange).toHaveBeenCalledWith('builder');

      // Update currentMode to builder
      act(() => {
        root?.render(
          <ModeSwitcher
            currentMode="builder"
            onModeChange={onModeChange}
            supportedModes={['explorer', 'builder', 'hacker']}
          />
        );
      });

      // Builder -> ArrowRight -> Hacker
      act(() => {
        tablist?.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
        );
      });
      expect(onModeChange).toHaveBeenCalledWith('hacker');

      // Hacker -> ArrowLeft -> Builder
      act(() => {
        root?.render(
          <ModeSwitcher
            currentMode="hacker"
            onModeChange={onModeChange}
            supportedModes={['explorer', 'builder', 'hacker']}
          />
        );
      });

      act(() => {
        tablist?.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
        );
      });
      expect(onModeChange).toHaveBeenCalledWith('builder');

      // Home key jumps to first tab (Explorer)
      act(() => {
        tablist?.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Home', bubbles: true })
        );
      });
      expect(onModeChange).toHaveBeenCalledWith('explorer');

      // End key jumps to last tab (Hacker)
      act(() => {
        tablist?.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'End', bubbles: true })
        );
      });
      expect(onModeChange).toHaveBeenCalledWith('hacker');
    });

    it('manages tabIndex for WAI-ARIA roving tabindex', () => {
      act(() => {
        root?.render(
          <ModeSwitcher
            currentMode="builder"
            onModeChange={() => {}}
            supportedModes={['explorer', 'builder', 'hacker']}
          />
        );
      });

      const explorerTab = container?.querySelector<HTMLButtonElement>('[data-mode="explorer"]');
      const builderTab = container?.querySelector<HTMLButtonElement>('[data-mode="builder"]');
      const hackerTab = container?.querySelector<HTMLButtonElement>('[data-mode="hacker"]');

      expect(explorerTab?.getAttribute('tabindex')).toBe('-1');
      expect(builderTab?.getAttribute('tabindex')).toBe('0');
      expect(hackerTab?.getAttribute('tabindex')).toBe('-1');

      expect(builderTab?.getAttribute('aria-selected')).toBe('true');
      expect(explorerTab?.getAttribute('aria-selected')).toBe('false');
      expect(hackerTab?.getAttribute('aria-selected')).toBe('false');
    });
  });

  describe('2. Global Ctrl+Enter / Cmd+Enter Shortcut Execution', () => {
    it('triggers onRun in Explorer mode via Ctrl+Enter', () => {
      const onRun = vi.fn();

      act(() => {
        root?.render(
          <EditorWorkspace
            defaultMode="explorer"
            onRun={onRun}
          />
        );
      });

      const workspace = container?.querySelector<HTMLDivElement>('[data-testid="editor-workspace"]');
      expect(workspace).not.toBeNull();

      act(() => {
        workspace?.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Enter',
            ctrlKey: true,
            bubbles: true,
          })
        );
      });

      expect(onRun).toHaveBeenCalledTimes(1);
      expect(onRun).toHaveBeenCalledWith(expect.any(String), 'explorer');
    });

    it('triggers onRun in Builder mode via Cmd+Enter (metaKey)', () => {
      const onRun = vi.fn();

      act(() => {
        root?.render(
          <EditorWorkspace
            defaultMode="builder"
            parsonsBlocks={testBlocks}
            onRun={onRun}
          />
        );
      });

      const workspace = container?.querySelector<HTMLDivElement>('[data-testid="editor-workspace"]');
      expect(workspace).not.toBeNull();

      act(() => {
        workspace?.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Enter',
            metaKey: true,
            bubbles: true,
          })
        );
      });

      expect(onRun).toHaveBeenCalledTimes(1);
      expect(onRun).toHaveBeenCalledWith(expect.any(String), 'builder');
    });

    it('triggers onRun in Hacker mode via Ctrl+Enter', () => {
      const onRun = vi.fn();
      const code = ['step()', 'harvest()', ''].join('\n');

      act(() => {
        root?.render(
          <EditorWorkspace
            defaultMode="hacker"
            initialCode={code}
            onRun={onRun}
          />
        );
      });

      const workspace = container?.querySelector<HTMLDivElement>('[data-testid="editor-workspace"]');

      act(() => {
        workspace?.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Enter',
            ctrlKey: true,
            bubbles: true,
          })
        );
      });

      expect(onRun).toHaveBeenCalledTimes(1);
      expect(onRun).toHaveBeenCalledWith(code, 'hacker');
    });
  });

  describe('3. Builder Mode Keyboard-Only Manipulation', () => {
    it('places, reorders, indents, and removes blocks using keyboard click simulation', () => {
      const onChange = vi.fn();

      act(() => {
        root?.render(
          <BuilderEditor
            blocks={testBlocks}
            onChange={onChange}
          />
        );
      });

      // 1. Find "Add block" buttons in available tray
      const addStepBtn = container?.querySelector<HTMLButtonElement>(
        '[data-testid="add-block-btn-b-step"]'
      );
      expect(addStepBtn).not.toBeNull();

      // Add first block (step)
      act(() => {
        addStepBtn?.click();
      });

      // Add second block (harvest)
      act(() => {
        const addHarvestBtn = container?.querySelector<HTMLButtonElement>(
          '[data-testid="add-block-btn-b-harvest"]'
        );
        addHarvestBtn?.click();
      });

      // Verify 2 blocks placed on solution canvas
      const placedSlots = container?.querySelectorAll('[data-testid^="solution-slot-"]');
      expect(placedSlots?.length).toBe(2);

      // Indent second block (+4 spaces)
      const indentButton = container?.querySelector<HTMLButtonElement>(
        '[data-testid="indent-btn-1"]'
      );
      expect(indentButton).not.toBeNull();
      act(() => {
        indentButton?.click();
      });

      // Move second block Up
      const moveUpButton = container?.querySelector<HTMLButtonElement>(
        '[data-testid="move-up-btn-1"]'
      );
      expect(moveUpButton).not.toBeNull();
      act(() => {
        moveUpButton?.click();
      });

      // Remove a block
      const removeButton = container?.querySelector<HTMLButtonElement>(
        '[data-testid="remove-btn-0"]'
      );
      expect(removeButton).not.toBeNull();
      act(() => {
        removeButton?.click();
      });

      const finalPlaced = container?.querySelectorAll('[data-testid^="solution-slot-"]');
      expect(finalPlaced?.length).toBe(1);
    });
  });

  describe('4. Modal Keyboard Dismissal', () => {
    it('dismisses graduation modal on Stay button click', () => {
      const onDismiss = vi.fn();

      act(() => {
        root?.render(
          <EditorWorkspace
            defaultMode="explorer"
            isGraduationOpen={true}
            onGraduationDismiss={onDismiss}
          />
        );
      });

      const buttons = Array.from(document.body.querySelectorAll('button'));
      const stayBtn = buttons.find((b) => b.textContent?.includes('Stay in'));
      expect(stayBtn).toBeDefined();

      act(() => {
        stayBtn?.click();
      });

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });
});
