import * as React from 'react';
import { cn } from '@tensorcade/ui';
import type { BloomLevel } from '@tensorcade/contracts';

export interface LessonDrawerProps {
  readonly isOpen: boolean;
  readonly title: string;
  readonly conceptTag: string;
  readonly bloomLevel: BloomLevel;
  readonly estimatedMinutes: number;
  readonly lessonContentMarkdown: string;
  readonly simplificationLabel?: string | undefined;
  readonly learningObjective?: string | undefined;
  readonly onClose?: (() => void) | undefined;
  readonly className?: string | undefined;
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return tokens.map((token, index) => {
    if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
      return (
        <code
          key={index}
          className="rounded-[var(--tc-radius-sm)] bg-[var(--tc-bg-base)] px-1 py-0.5 font-mono text-xs text-[var(--tc-accent-cyan)]"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
      return (
        <strong key={index} className="font-semibold text-[var(--tc-text-primary)]">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
      return (
        <em key={index} className="italic text-[var(--tc-text-primary)]">
          {token.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={index}>{token}</React.Fragment>;
  });
}

function renderMarkdownBlocks(markdown: string): React.ReactNode[] {
  const lines = markdown.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (keyPrefix: string) => {
    if (listItems.length === 0) return;
    elements.push(
      <ul
        key={`${keyPrefix}-ul`}
        className="list-disc pl-5 space-y-1 text-sm text-[var(--tc-text-muted)]"
      >
        {listItems.map((item, idx) => (
          <li key={idx}>{renderInlineMarkdown(item)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      flushList(`empty-${index}`);
      return;
    }

    if (line.startsWith('- ')) {
      listItems.push(line.slice(2));
      return;
    }

    flushList(`line-${index}`);

    if (line.startsWith('### ')) {
      elements.push(
        <h4
          key={index}
          className="pt-2 font-mono text-xs font-semibold uppercase tracking-wider text-[var(--tc-accent-cyan)]"
        >
          {renderInlineMarkdown(line.slice(4))}
        </h4>,
      );
      return;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={index} className="pt-3 text-base font-semibold text-[var(--tc-text-primary)]">
          {renderInlineMarkdown(line.slice(3))}
        </h3>,
      );
      return;
    }

    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={index} className="text-lg font-bold text-[var(--tc-text-primary)]">
          {renderInlineMarkdown(line.slice(2))}
        </h2>,
      );
      return;
    }

    elements.push(
      <p key={index} className="text-sm leading-relaxed text-[var(--tc-text-muted)]">
        {renderInlineMarkdown(line)}
      </p>,
    );
  });

  flushList('end');
  return elements;
}

/**
 * Accessible slide-out / complementary lesson panel displaying concept metadata,
 * simplification notice, and structured lesson markdown.
 */
export function LessonDrawer({
  isOpen,
  title,
  conceptTag,
  bloomLevel,
  estimatedMinutes,
  lessonContentMarkdown,
  simplificationLabel,
  learningObjective,
  onClose,
  className,
}: LessonDrawerProps): React.JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return (
    <aside
      aria-label={`Lesson Drawer: ${title}`}
      className={cn(
        'flex flex-col border border-[var(--tc-border-subtle)] bg-[var(--tc-bg-surface)] rounded-[var(--tc-radius-md)] overflow-hidden',
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-[var(--tc-border-subtle)] px-4 py-3">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <span className="rounded-[var(--tc-radius-sm)] border border-[var(--tc-border-subtle)] bg-[var(--tc-bg-base)] px-2 py-0.5 text-[var(--tc-accent-cyan)] font-semibold">
              {conceptTag}
            </span>
            <span className="rounded-[var(--tc-radius-sm)] border border-[var(--tc-border-subtle)] bg-[var(--tc-bg-base)] px-2 py-0.5 text-[var(--tc-accent-indigo)]">
              Bloom: {bloomLevel}
            </span>
            <span className="text-[var(--tc-text-muted)]">{estimatedMinutes} min</span>
          </div>
          <h2 className="text-base font-bold text-[var(--tc-text-primary)]">{title}</h2>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Lesson Drawer"
            className="rounded-[var(--tc-radius-sm)] p-1 text-xs font-mono text-[var(--tc-text-muted)] hover:bg-[var(--tc-border-subtle)] hover:text-[var(--tc-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--tc-accent-cyan)] focus-visible:outline-offset-[var(--tc-focus-outline-offset)]"
          >
            ✕
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {simplificationLabel && (
          <div
            role="note"
            aria-label="Simulation Simplification Notice"
            className="rounded-[var(--tc-radius-sm)] border border-[var(--tc-accent-amber)] bg-[var(--tc-bg-base)] px-3 py-2 text-xs text-[var(--tc-accent-amber)] font-mono"
          >
            {simplificationLabel}
          </div>
        )}

        {learningObjective && (
          <div className="rounded-[var(--tc-radius-sm)] border border-[var(--tc-border-subtle)] bg-[var(--tc-bg-base)] px-3 py-2">
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--tc-text-muted)]">
              Objective
            </p>
            <p className="mt-1 text-xs text-[var(--tc-text-primary)]">{learningObjective}</p>
          </div>
        )}

        <div className="space-y-2.5">{renderMarkdownBlocks(lessonContentMarkdown)}</div>
      </div>
    </aside>
  );
}
