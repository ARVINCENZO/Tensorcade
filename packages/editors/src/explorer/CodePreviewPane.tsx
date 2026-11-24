import * as React from 'react';
import { Button } from '@tensorcade/ui';

export interface CodePreviewPaneProps {
  code: string;
  onRun?: (() => void) | undefined;
  readOnly?: boolean | undefined;
  className?: string | undefined;
}

const PLACEHOLDER_PYTHON = `# Assembled blocks transpile to live Python code here.
# Drag blocks from the toolbox into the workspace to begin.`;

/**
 * Read-only Code Preview Pane showing live transpiled PEP 8 Python code.
 * Occupies the right 40% of the Explorer editor split-screen.
 */
export function CodePreviewPane({
  code,
  onRun,
  readOnly = false,
  className = '',
}: CodePreviewPaneProps): React.JSX.Element {
  const displayCode = code.trim().length > 0 ? code : PLACEHOLDER_PYTHON;
  const isPlaceholder = code.trim().length === 0;
  const lines = displayCode.split('\n');

  return (
    <div
      role="region"
      aria-label="Transpiled Python code preview"
      className={`flex h-full w-full flex-col bg-[#0B0F17] text-[#F8FAFC] ${className}`}
      data-testid="code-preview-pane"
    >
      {/* Pane Header */}
      <header className="flex h-12 flex-shrink-0 items-center justify-between border-b border-[#232E42] px-4 py-2 bg-[#151C28]/60">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#38BDF8]">
            Python Preview
          </span>
          <span
            className="rounded border border-[#232E42] bg-[#0B0F17] px-1.5 py-0.5 font-mono text-[10px] text-[#94A3B8]"
            data-testid="transpile-badge"
          >
            PEP 8 Live
          </span>
        </div>

        {onRun && (
          <Button
            size="sm"
            onClick={onRun}
            disabled={readOnly || isPlaceholder}
            className="h-8 gap-1.5 text-xs font-medium"
            data-testid="btn-run-code"
          >
            <span aria-hidden="true">&#9654;</span>
            <span>Execute</span>
          </Button>
        )}
      </header>

      {/* Code Viewer Body */}
      <div className="relative flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed">
        <pre className="m-0 flex min-w-full">
          {/* Line Numbers Gutter */}
          <div
            aria-hidden="true"
            className="mr-4 select-none border-r border-[var(--tc-border-subtle,#232E42)] pr-3 text-right font-mono text-[var(--tc-text-muted,#94A3B8)]"
            data-testid="line-numbers-gutter"
          >
            {lines.map((_, idx) => (
              <div key={idx} className="h-5 leading-5">
                {idx + 1}
              </div>
            ))}
          </div>

          {/* Code Content */}
          <code
            className={`flex-1 font-mono ${
              isPlaceholder
                ? 'italic text-[var(--tc-text-muted,#94A3B8)]'
                : 'text-[var(--tc-text-primary,#F8FAFC)]'
            }`}
            data-testid="transpiled-code-content"
          >
            {lines.map((line, idx) => (
              <div key={idx} className="h-5 leading-5 whitespace-pre">
                {line || ' '}
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
