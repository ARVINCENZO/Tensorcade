// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { DiagnosticError } from '@tensorcade/contracts';
import { ErrorFeedbackPanel } from './ErrorFeedbackPanel.js';

// Configure React act environment for happy-dom
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockDiagnosticError: DiagnosticError = {
  errorType: 'IndexError',
  whatHappened:
    'Your code attempted to read row index 3, but the crop grid only has 3 rows (indices 0, 1, and 2).',
  whereItOccurred: {
    line: 4,
    column: 15,
    sourceSnippet: 'crop = field[row_idx, col_idx]',
  },
  whyItMatters:
    'In Python and NumPy, indexing starts at 0. A grid of height 3 has valid row indices [0, 1, 2]. Index 3 looks past the edge.',
  whatToInvestigate:
    'Check your loop boundary in Line 2. Are you iterating range(height) or range(height + 1)?',
  rawTraceback: [
    'Traceback (most recent call last):',
    '  File "<learner_code>", line 4, in <module>',
    '    crop = field[row_idx, col_idx]',
    'IndexError: index 3 is out of bounds for axis 0 with size 3',
  ].join('\n'),
};

describe('ErrorFeedbackPanel', () => {
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

  describe('Static markup and pedagogical anatomy (docs/02-learning-design.md §9)', () => {
    it('renders the complete 4-part diagnostic feedback anatomy', () => {
      const html = renderToStaticMarkup(
        <ErrorFeedbackPanel error={mockDiagnosticError} />,
      );

      // 1. WHAT HAPPENED
      expect(html).toContain('1. WHAT HAPPENED:');
      expect(html).toContain(mockDiagnosticError.whatHappened);

      // 2. WHERE IT OCCURRED
      expect(html).toContain('2. WHERE IT OCCURRED:');
      expect(html).toContain('Line 4, Column 15');
      expect(html).toContain('crop = field[row_idx, col_idx]');
      expect(html).toContain('Jump to Line');

      // 3. WHY IT MATTERS
      expect(html).toContain('3. WHY IT MATTERS:');
      expect(html).toContain(mockDiagnosticError.whyItMatters);

      // 4. WHAT TO INVESTIGATE
      expect(html).toContain('4. WHAT TO INVESTIGATE:');
      expect(html).toContain(mockDiagnosticError.whatToInvestigate);

      // Diagnostic badge and title
      expect(html).toContain('[DIAGNOSTIC]');
      expect(html).toContain('IndexError');
    });

    it('enforces adult, respectful tone with zero juvenile phrasing', () => {
      const html = renderToStaticMarkup(
        <ErrorFeedbackPanel error={mockDiagnosticError} />,
      );

      expect(html.toLowerCase()).not.toContain('oops');
      expect(html.toLowerCase()).not.toContain('whoops');
      expect(html.toLowerCase()).not.toContain('uh oh');
      expect(html.toLowerCase()).not.toContain('yikes');
    });

    it('has accessible role="alert" and assertive live region attributes', () => {
      const html = renderToStaticMarkup(
        <ErrorFeedbackPanel error={mockDiagnosticError} />,
      );

      expect(html).toContain('role="alert"');
      expect(html).toContain('aria-live="assertive"');
      expect(html).toContain('aria-atomic="true"');
    });

    it('returns null when error is undefined', () => {
      const html = renderToStaticMarkup(<ErrorFeedbackPanel error={undefined} />);
      expect(html).toBe('');
    });

    it('expands tab characters to 4 spaces to maintain visual caret alignment', () => {
      const tabError: DiagnosticError = {
        ...mockDiagnosticError,
        whereItOccurred: {
          line: 2,
          column: 3, // after \t and 1 char
          sourceSnippet: '\ta = 10',
        },
      };

      const html = renderToStaticMarkup(<ErrorFeedbackPanel error={tabError} />);
      // 4 spaces + 'a' = 5 chars before caret
      expect(html).toContain('    a = 10');
      // linePrefix "Line 2: " (8 chars) + 4 spaces + 1 char = 13 spaces before ^
      expect(html).toContain(`${' '.repeat(8 + 5)}^`);
    });
  });

  describe('Interactive Behaviors', () => {
    it('fires onJumpToLine callback with exact line and column numbers', async () => {
      const onJumpToLine = vi.fn();

      await act(async () => {
        root?.render(
          <ErrorFeedbackPanel
            error={mockDiagnosticError}
            onJumpToLine={onJumpToLine}
          />,
        );
      });

      const jumpButton = container?.querySelector(
        'button[aria-label="Jump to line 4, column 15"]',
      ) as HTMLButtonElement | null;

      expect(jumpButton).not.toBeNull();
      expect(jumpButton?.textContent).toContain('Jump to Line');

      await act(async () => {
        jumpButton?.click();
      });

      expect(onJumpToLine).toHaveBeenCalledTimes(1);
      expect(onJumpToLine).toHaveBeenCalledWith(4, 15);
    });

    it('toggles the collapsible Raw Python Traceback disclosure', async () => {
      await act(async () => {
        root?.render(<ErrorFeedbackPanel error={mockDiagnosticError} />);
      });

      // Disclosure button exists
      const toggleButton = container?.querySelector(
        'button[aria-controls="raw-traceback-content"]',
      ) as HTMLButtonElement | null;

      expect(toggleButton).not.toBeNull();
      expect(toggleButton?.getAttribute('aria-expanded')).toBe('false');

      // Traceback content initially not rendered
      let tracebackPre = container?.querySelector('#raw-traceback-content');
      expect(tracebackPre).toBeNull();

      // Click to expand disclosure
      await act(async () => {
        toggleButton?.click();
      });

      expect(toggleButton?.getAttribute('aria-expanded')).toBe('true');
      tracebackPre = container?.querySelector('#raw-traceback-content');
      expect(tracebackPre).not.toBeNull();
      expect(tracebackPre?.textContent).toContain('IndexError: index 3 is out of bounds');

      // Click to collapse disclosure
      await act(async () => {
        toggleButton?.click();
      });

      expect(toggleButton?.getAttribute('aria-expanded')).toBe('false');
      tracebackPre = container?.querySelector('#raw-traceback-content');
      expect(tracebackPre).toBeNull();
    });

    it('fires onDismiss callback when dismiss button is clicked', async () => {
      const onDismiss = vi.fn();

      await act(async () => {
        root?.render(
          <ErrorFeedbackPanel
            error={mockDiagnosticError}
            onDismiss={onDismiss}
          />,
        );
      });

      const dismissButton = container?.querySelector(
        'button[aria-label="Dismiss diagnostic error"]',
      ) as HTMLButtonElement | null;

      expect(dismissButton).not.toBeNull();

      await act(async () => {
        dismissButton?.click();
      });

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('does not render disclosure when rawTraceback is absent', async () => {
      const errorWithoutTraceback: DiagnosticError = {
        ...mockDiagnosticError,
        rawTraceback: undefined,
      };

      await act(async () => {
        root?.render(<ErrorFeedbackPanel error={errorWithoutTraceback} />);
      });

      const toggleButton = container?.querySelector(
        'button[aria-controls="raw-traceback-content"]',
      );
      expect(toggleButton).toBeNull();
    });
  });
});
