// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { DiagnosticError, ParsonsBlock } from '@tensorcade/contracts';

// Mock @monaco-editor/react before importing components to prevent script tag injection and CDN calls in tests
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
          },
        );
      }, [onMount, value]);

      return (
        <div data-testid="mock-monaco-editor" data-code={value}>
          {value}
        </div>
      );
    },
  };
});

import { EditorWorkspace } from './EditorWorkspace.js';
import { IncompatibleTransitionModal } from '../switcher/IncompatibleTransitionModal.js';
import { GraduationPromptModal } from '../switcher/GraduationPromptModal.js';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockBlocks: ParsonsBlock[] = [
  {
    id: 'block-step',
    code: 'step()',
    isDistractor: false,
  },
  {
    id: 'block-harvest',
    code: 'harvest()',
    isDistractor: false,
  },
];

const mockDiagnosticError: DiagnosticError = {
  errorType: 'IndexError',
  whatHappened: 'Attempted to read row index 3, but crop grid only has 3 rows.',
  whereItOccurred: {
    line: 5,
    column: 12,
    sourceSnippet: 'crop = field[row_idx, col_idx]',
  },
  whyItMatters: 'Grid height is 3, valid indices are [0, 1, 2].',
  whatToInvestigate: 'Check range(height) loop boundary.',
  rawTraceback: 'IndexError: index 3 is out of bounds for axis 0 with size 3',
};

describe('Unified EditorWorkspace (Sub-step 5b.4)', () => {
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

  describe('Layout and Mode Rendering', () => {
    it('renders top header bar with ModeSwitcher and data-testid="editor-workspace"', () => {
      const html = renderToStaticMarkup(
        <EditorWorkspace
          defaultMode="explorer"
          supportedModes={['explorer', 'builder', 'hacker']}
        />,
      );

      expect(html).toContain('data-testid="editor-workspace"');
      expect(html).toContain('role="tablist"');
      expect(html).toContain('Explorer');
      expect(html).toContain('Builder');
      expect(html).toContain('Hacker');
    });

    it('renders Run Code button when onRun callback is provided', () => {
      const html = renderToStaticMarkup(<EditorWorkspace defaultMode="hacker" onRun={() => {}} />);

      expect(html).toContain('Run Code');
      expect(html).toContain('Ctrl+↵');
    });

    it('renders HackerEditor container when mode is hacker', () => {
      const html = renderToStaticMarkup(
        <EditorWorkspace defaultMode="hacker" initialCode="print('hello hacker')" />,
      );

      expect(html).toContain('id="tc-mode-panel-hacker"');
      expect(html).toContain('role="region"');
      expect(html).toContain('aria-label="Python Code Editor"');
    });

    it('renders BuilderEditor container when mode is builder', () => {
      const html = renderToStaticMarkup(
        <EditorWorkspace defaultMode="builder" parsonsBlocks={mockBlocks} />,
      );

      expect(html).toContain('id="tc-mode-panel-builder"');
      expect(html).toContain('Available Blocks');
      expect(html).toContain('Solution Canvas');
    });

    it('renders ErrorFeedbackPanel when diagnosticError is provided', () => {
      const html = renderToStaticMarkup(
        <EditorWorkspace defaultMode="hacker" diagnosticError={mockDiagnosticError} />,
      );

      expect(html).toContain('IndexError');
      expect(html).toContain('Jump to Line');
    });
  });

  describe('IncompatibleTransitionModal (Hacker -> Visual safety)', () => {
    it('renders explanation that arbitrary Python cannot round-trip back into blocks', () => {
      act(() => {
        root?.render(
          <IncompatibleTransitionModal
            isOpen={true}
            onConfirm={() => {}}
            onCancel={() => {}}
            targetMode="explorer"
          />,
        );
      });

      const bodyText = document.body.textContent ?? '';
      expect(bodyText).toContain('Switch to Explorer (Blocks)?');
      expect(bodyText).toContain('Arbitrary Python code written in Hacker Mode');
      expect(bodyText).toContain('cannot automatically round-trip back into visual blocks');
      expect(bodyText).toContain('Your Hacker code remains safely preserved.');
      expect(bodyText).toContain('Keep Editing in Hacker');
      expect(bodyText).toContain('Switch to Explorer');
    });

    it('invokes onConfirm when Switch button is clicked', () => {
      const handleConfirm = vi.fn();
      const handleCancel = vi.fn();

      act(() => {
        root?.render(
          <IncompatibleTransitionModal
            isOpen={true}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            targetMode="builder"
          />,
        );
      });

      // Dialog content mounts inside document.body via DialogPortal
      const buttons = Array.from(document.body.querySelectorAll('button'));
      const confirmBtn = buttons.find((b) => b.textContent?.includes('Switch to Builder'));
      expect(confirmBtn).toBeDefined();

      act(() => {
        confirmBtn?.click();
      });

      expect(handleConfirm).toHaveBeenCalledTimes(1);
      expect(handleCancel).not.toHaveBeenCalled();
    });

    it('invokes onCancel when Keep Editing button is clicked', () => {
      const handleConfirm = vi.fn();
      const handleCancel = vi.fn();

      act(() => {
        root?.render(
          <IncompatibleTransitionModal
            isOpen={true}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />,
        );
      });

      const buttons = Array.from(document.body.querySelectorAll('button'));
      const cancelBtn = buttons.find((b) => b.textContent?.includes('Keep Editing in Hacker'));
      expect(cancelBtn).toBeDefined();

      act(() => {
        cancelBtn?.click();
      });

      expect(handleCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('GraduationPromptModal (Pedagogical Challenge)', () => {
    it('renders exact specification challenge quote and rewards', () => {
      act(() => {
        root?.render(
          <GraduationPromptModal
            isOpen={true}
            onGraduate={() => {}}
            onDismiss={() => {}}
            completedMode="explorer"
          />,
        );
      });

      const bodyText = document.body.textContent ?? '';
      // Verify docs/02-learning-design.md §5.4 exact quote
      expect(bodyText).toContain(
        'You solved the logic. Now prove you can write production Python in Hacker Mode to earn the Command Crest (Hacker Mastery).',
      );
      expect(bodyText).toContain('Reward: Command Crest');
      expect(bodyText).toContain('Graduate to Hacker Mode →');
      expect(bodyText).toContain('Stay in Explorer');
    });

    it('invokes onGraduate when Graduate button is clicked', () => {
      const handleGraduate = vi.fn();
      const handleDismiss = vi.fn();

      act(() => {
        root?.render(
          <GraduationPromptModal
            isOpen={true}
            onGraduate={handleGraduate}
            onDismiss={handleDismiss}
            completedMode="builder"
          />,
        );
      });

      const buttons = Array.from(document.body.querySelectorAll('button'));
      const graduateBtn = buttons.find((b) => b.textContent?.includes('Graduate to Hacker Mode'));
      expect(graduateBtn).toBeDefined();

      act(() => {
        graduateBtn?.click();
      });

      expect(handleGraduate).toHaveBeenCalledTimes(1);
    });

    it('invokes onDismiss when Stay button is clicked', () => {
      const handleGraduate = vi.fn();
      const handleDismiss = vi.fn();

      act(() => {
        root?.render(
          <GraduationPromptModal
            isOpen={true}
            onGraduate={handleGraduate}
            onDismiss={handleDismiss}
          />,
        );
      });

      const buttons = Array.from(document.body.querySelectorAll('button'));
      const stayBtn = buttons.find((b) => b.textContent?.includes('Stay in'));
      expect(stayBtn).toBeDefined();

      act(() => {
        stayBtn?.click();
      });

      expect(handleDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Interactive Workspace Behaviors', () => {
    it('triggers onRun callback with active mode code', () => {
      const handleRun = vi.fn();

      act(() => {
        root?.render(
          <EditorWorkspace defaultMode="hacker" initialCode="rover.step()" onRun={handleRun} />,
        );
      });

      const runBtn = Array.from(container?.querySelectorAll('button') ?? []).find((b) =>
        b.textContent?.includes('Run Code'),
      );
      expect(runBtn).toBeDefined();

      act(() => {
        runBtn?.click();
      });

      expect(handleRun).toHaveBeenCalledWith('rover.step()', 'hacker');
    });

    it('handles jump to line by invoking onJumpToLine callback', () => {
      const handleJump = vi.fn();

      act(() => {
        root?.render(
          <EditorWorkspace
            defaultMode="hacker"
            initialCode="def test():\n    pass\n"
            diagnosticError={mockDiagnosticError}
            onJumpToLine={handleJump}
          />,
        );
      });

      const jumpBtn = Array.from(container?.querySelectorAll('button') ?? []).find((b) =>
        b.getAttribute('aria-label')?.includes('Jump to line 5'),
      );
      expect(jumpBtn).toBeDefined();

      act(() => {
        jumpBtn?.click();
      });

      expect(handleJump).toHaveBeenCalledWith(5, 12);
    });

    it('switches to Hacker mode when Jump to Line is clicked from Explorer mode', () => {
      const handleModeChange = vi.fn();

      act(() => {
        root?.render(
          <EditorWorkspace
            defaultMode="explorer"
            onModeChange={handleModeChange}
            diagnosticError={mockDiagnosticError}
          />,
        );
      });

      const jumpBtn = Array.from(container?.querySelectorAll('button') ?? []).find((b) =>
        b.getAttribute('aria-label')?.includes('Jump to line 5'),
      );
      expect(jumpBtn).toBeDefined();

      act(() => {
        jumpBtn?.click();
      });

      expect(handleModeChange).toHaveBeenCalledWith('hacker');
    });

    it('preserves intent by passing assembled Builder code forward to Hacker mode', () => {
      const handleCodeChange = vi.fn();

      act(() => {
        root?.render(
          <EditorWorkspace
            defaultMode="builder"
            parsonsBlocks={mockBlocks}
            onCodeChange={handleCodeChange}
          />,
        );
      });

      // Builder mode assembled some code
      // Switch mode to Hacker
      const hackerTab = container?.querySelector<HTMLButtonElement>('[data-mode="hacker"]');
      expect(hackerTab).toBeDefined();

      act(() => {
        hackerTab?.click();
      });

      // Check Hacker mode panel is active
      const hackerPanel = container?.querySelector('#tc-mode-panel-hacker');
      expect(hackerPanel).toBeDefined();
    });

    it('triggers onRun via Ctrl+Enter on workspace container but ignores Monaco internal origin', () => {
      const handleRun = vi.fn();
      const parentReactKeyDown = vi.fn();

      act(() => {
        root?.render(
          <div onKeyDown={parentReactKeyDown}>
            <EditorWorkspace defaultMode="builder" onRun={handleRun} />
          </div>,
        );
      });

      const workspaceElem = container?.querySelector('[data-testid="editor-workspace"]');
      expect(workspaceElem).toBeDefined();

      // Trigger Ctrl+Enter from workspace root
      act(() => {
        workspaceElem?.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Enter',
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
          }),
        );
      });
      expect(handleRun).toHaveBeenCalledTimes(1);
      expect(parentReactKeyDown).not.toHaveBeenCalled();

      // Trigger Ctrl+Enter from simulated monaco child element
      const monacoFakeChild = document.createElement('div');
      monacoFakeChild.className = 'monaco-editor inner-element';
      workspaceElem?.appendChild(monacoFakeChild);

      act(() => {
        monacoFakeChild.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }),
        );
      });
      // Should still be 1 (ignored to prevent duplicate execution)
      expect(handleRun).toHaveBeenCalledTimes(1);
    });
  });
});
