import * as React from 'react';
import type { DiagnosticError } from '@tensorcade/contracts';
import { Button, cn } from '@tensorcade/ui';

export interface ErrorFeedbackPanelProps {
  /**
   * Diagnostic error payload structured according to docs/02-learning-design.md §9.
   */
  readonly error?: DiagnosticError | undefined;

  /**
   * Action callback triggered when the learner clicks [Jump to Line].
   */
  readonly onJumpToLine?: ((line: number, column: number) => void) | undefined;

  /**
   * Optional callback to dismiss the error panel.
   */
  readonly onDismiss?: (() => void) | undefined;

  /**
   * Optional additional CSS class names for the container.
   */
  readonly className?: string | undefined;
}

/**
 * Pedagogical Error Surfacing Panel ('Why Did My Run Fail?').
 *
 * Implements the 4-part diagnostic feedback anatomy specified in docs/02-learning-design.md §9:
 * 1. WHAT HAPPENED: Plain English explanation of the failure.
 * 2. WHERE IT OCCURRED: Exact source line, column, snippet with caret, and [Jump to Line] action.
 * 3. WHY IT MATTERS: Algorithmic concept and computational thinking rationale.
 * 4. WHAT TO INVESTIGATE: Targeted self-diagnosis questions.
 *
 * Features:
 * - Respectful, adult tone (no juvenile phrasing).
 * - Accessible alert role (role="alert", aria-live="assertive").
 * - Collapsible 'Raw Python Traceback' disclosure for advanced learners.
 */
export function ErrorFeedbackPanel({
  error,
  onJumpToLine,
  onDismiss,
  className,
}: ErrorFeedbackPanelProps): React.JSX.Element | null {
  const [isTracebackOpen, setIsTracebackOpen] = React.useState<boolean>(false);

  if (!error) {
    return null;
  }

  const { line, column, sourceSnippet } = error.whereItOccurred;
  const linePrefix = `Line ${line}: `;
  // Expand tabs to 4 spaces for aligned monospace visual presentation
  const prefixBeforeColumn = sourceSnippet.slice(0, Math.max(0, column > 0 ? column - 1 : 0));
  const expandedPrefix = prefixBeforeColumn.replace(/\t/g, '    ');
  const expandedSnippet = sourceSnippet.replace(/\t/g, '    ');
  const caretOffset = expandedPrefix.length;
  const indicatorSpacing = ' '.repeat(linePrefix.length + caretOffset);

  const handleJump = (): void => {
    onJumpToLine?.(line, column);
  };

  const handleToggleTraceback = (): void => {
    setIsTracebackOpen((prev) => !prev);
  };

  return (
    <aside
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={cn(
        'flex flex-col gap-3.5 rounded-[var(--tc-radius-md)] border border-[var(--tc-accent-crimson)]',
        'bg-[var(--tc-bg-surface)] p-4 text-[var(--tc-text-primary)] font-sans shadow-lg',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-[var(--tc-border-subtle)] pb-2.5">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center rounded-[var(--tc-radius-sm)] bg-[var(--tc-accent-crimson)] px-2 py-0.5 text-xs font-mono font-bold text-[var(--tc-bg-base)] uppercase tracking-wide"
            aria-hidden="true"
          >
            [DIAGNOSTIC]
          </span>
          <h3 className="text-sm font-semibold tracking-tight text-[var(--tc-text-primary)] font-mono">
            {error.errorType}
          </h3>
        </div>
        {onDismiss ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            aria-label="Dismiss diagnostic error"
            className="h-6 w-6 p-0 text-[var(--tc-text-muted)] hover:text-[var(--tc-text-primary)]"
          >
            ✕
          </Button>
        ) : null}
      </div>

      {/* 1. WHAT HAPPENED */}
      <section className="flex flex-col gap-1" aria-labelledby="diagnostic-what-happened">
        <h4
          id="diagnostic-what-happened"
          className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--tc-accent-crimson)]"
        >
          1. WHAT HAPPENED:
        </h4>
        <p className="text-sm text-[var(--tc-text-primary)] leading-relaxed pl-2 border-l-2 border-[var(--tc-accent-crimson)]">
          {error.whatHappened}
        </p>
      </section>

      {/* 2. WHERE IT OCCURRED */}
      <section className="flex flex-col gap-2" aria-labelledby="diagnostic-where-it-occurred">
        <div className="flex items-center justify-between">
          <h4
            id="diagnostic-where-it-occurred"
            className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--tc-accent-amber)]"
          >
            2. WHERE IT OCCURRED:
          </h4>
          <span className="text-xs font-mono text-[var(--tc-text-muted)]">
            Line {line}, Column {column}
          </span>
        </div>

        <div className="rounded-[var(--tc-radius-sm)] border border-[var(--tc-border-subtle)] bg-[var(--tc-bg-base)] p-3 font-mono text-xs overflow-x-auto">
          <div className="text-[var(--tc-text-primary)] whitespace-pre">
            <span className="text-[var(--tc-text-dim)] select-none">{linePrefix}</span>
            <span>{expandedSnippet}</span>
          </div>
          <div
            className="text-[var(--tc-accent-crimson)] whitespace-pre select-none font-bold"
            aria-hidden="true"
          >
            {indicatorSpacing}^
          </div>
        </div>

        <div className="flex justify-end pt-0.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleJump}
            aria-label={`Jump to line ${line}, column ${column}`}
            className="font-mono text-xs"
          >
            Jump to Line
          </Button>
        </div>
      </section>

      {/* 3. WHY IT MATTERS */}
      <section className="flex flex-col gap-1" aria-labelledby="diagnostic-why-it-matters">
        <h4
          id="diagnostic-why-it-matters"
          className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--tc-accent-cyan)]"
        >
          3. WHY IT MATTERS:
        </h4>
        <p className="text-sm text-[var(--tc-text-primary)] leading-relaxed pl-2 border-l-2 border-[var(--tc-accent-cyan)]">
          {error.whyItMatters}
        </p>
      </section>

      {/* 4. WHAT TO INVESTIGATE */}
      <section className="flex flex-col gap-1" aria-labelledby="diagnostic-what-to-investigate">
        <h4
          id="diagnostic-what-to-investigate"
          className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--tc-accent-emerald)]"
        >
          4. WHAT TO INVESTIGATE:
        </h4>
        <p className="text-sm text-[var(--tc-text-muted)] leading-relaxed pl-2 border-l-2 border-[var(--tc-accent-emerald)]">
          {error.whatToInvestigate}
        </p>
      </section>

      {/* Collapsible Raw Python Traceback */}
      {error.rawTraceback ? (
        <div className="border-t border-[var(--tc-border-subtle)] pt-2">
          <button
            type="button"
            onClick={handleToggleTraceback}
            aria-expanded={isTracebackOpen}
            aria-controls="raw-traceback-content"
            className="flex items-center gap-1.5 text-xs font-mono text-[var(--tc-text-dim)] hover:text-[var(--tc-text-primary)] transition-colors cursor-pointer select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--tc-accent-cyan)] focus-visible:outline-offset-[var(--tc-focus-outline-offset)]"
          >
            <span aria-hidden="true">{isTracebackOpen ? '▼' : '▶'}</span>
            <span>Raw Python Traceback</span>
          </button>
          {isTracebackOpen ? (
            <pre
              id="raw-traceback-content"
              className="mt-2 rounded-[var(--tc-radius-sm)] border border-[var(--tc-border-subtle)] bg-[var(--tc-bg-base)] p-3 font-mono text-xs text-[var(--tc-text-dim)] overflow-x-auto whitespace-pre-wrap"
            >
              {error.rawTraceback}
            </pre>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
