import type { DiagnosticError } from '@tensorcade/contracts';
import type { editor } from 'monaco-editor';
import type { Monaco } from '@monaco-editor/react';

/**
 * Range of code lines locked against modification or deletion (1-indexed).
 */
export interface LockedRange {
  readonly startLine: number;
  readonly endLine: number;
}

/**
 * Props for the Monaco-based Hacker Mode Python code editor.
 */
export interface HackerEditorProps {
  /** Current Python code content. */
  readonly code: string;
  /** Callback fired whenever the learner edits code outside locked regions. */
  readonly onChange?: (code: string) => void;
  /** 1-indexed line ranges that cannot be modified or deleted. */
  readonly lockedRanges?: ReadonlyArray<LockedRange> | undefined;
  /** 4-part pedagogical diagnostic failure details, if execution failed. */
  readonly diagnosticError?: DiagnosticError | undefined;
  /** Callback triggered by Ctrl+Enter or Cmd+Enter. */
  readonly onRun?: (() => void) | undefined;
  /** Whether the entire editor is in read-only mode. */
  readonly readOnly?: boolean | undefined;
  /** Height of the editor container (default: '100%'). */
  readonly height?: string | number | undefined;
  /** Width of the editor container (default: '100%'). */
  readonly width?: string | number | undefined;
  /** Additional CSS class names. */
  readonly className?: string | undefined;
  /** Lifecycle hook called when Monaco finishes mounting. */
  readonly onMount?: ((editor: editor.IStandaloneCodeEditor, monaco: Monaco) => void) | undefined;
}
