import type { editor, IKeyboardEvent } from 'monaco-editor';
import type { Monaco } from '@monaco-editor/react';
import type { LockedRange } from './types.js';

/**
 * Checks whether a 1-indexed line number falls inside any locked range.
 */
export function isLineInRange(line: number, lockedRanges: ReadonlyArray<LockedRange>): boolean {
  for (const range of lockedRanges) {
    if (line >= range.startLine && line <= range.endLine) {
      return true;
    }
  }
  return false;
}

/**
 * Determines whether a line range intersects any locked range.
 */
export function isRangeIntersectingLocked(
  range: { startLineNumber: number; endLineNumber: number },
  lockedRanges: ReadonlyArray<LockedRange>
): boolean {
  for (const locked of lockedRanges) {
    if (range.startLineNumber <= locked.endLine && range.endLineNumber >= locked.startLine) {
      return true;
    }
  }
  return false;
}

/**
 * Creates Monaco model delta decorations for all locked regions.
 */
export function buildLockedDecorations(
  monacoInstance: Monaco,
  lockedRanges: ReadonlyArray<LockedRange>
): editor.IModelDeltaDecoration[] {
  return lockedRanges.map((locked) => ({
    range: new monacoInstance.Range(locked.startLine, 1, locked.endLine, 1),
    options: {
      isWholeLine: true,
      className: 'tc-locked-line',
      glyphMarginClassName: 'tc-locked-gutter',
      linesDecorationsClassName: 'tc-locked-gutter-icon',
      hoverMessage: {
        value: '🔒 **Locked region**: This line is part of the level harness and cannot be edited.',
      },
      stickiness: monacoInstance.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
    },
  }));
}

/**
 * Navigation and passive keys that learners are allowed to use even inside locked ranges.
 */
const PASSIVE_KEY_CODES = new Set<string>([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Escape',
  'Tab', // handled contextually or for focus navigation
]);

/**
 * Evaluates whether a keyboard event on a locked line should be blocked.
 * Returns true if the event was intercepted and prevented, false otherwise.
 */
export function handleLockedKeyDown(
  event: IKeyboardEvent,
  editorInstance: editor.IStandaloneCodeEditor,
  lockedRanges: ReadonlyArray<LockedRange>
): boolean {
  if (lockedRanges.length === 0) {
    return false;
  }

  const selection = editorInstance.getSelection();
  if (!selection) {
    return false;
  }

  const overlaps = isRangeIntersectingLocked(
    {
      startLineNumber: selection.startLineNumber,
      endLineNumber: selection.endLineNumber,
    },
    lockedRanges
  );

  if (!overlaps) {
    return false;
  }

  // Allow copy commands (Ctrl+C / Cmd+C)
  const isCtrlOrCmd = event.ctrlKey || event.metaKey;
  const browserEvent = event.browserEvent;
  const key = browserEvent?.key ?? '';

  if (isCtrlOrCmd && (key === 'c' || key === 'C')) {
    return false;
  }

  // Allow navigation keys
  if (PASSIVE_KEY_CODES.has(key)) {
    return false;
  }

  // Block modification keys (letters, numbers, Enter, Backspace, Delete, Cut, Paste, etc.)
  event.preventDefault();
  event.stopPropagation();
  return true;
}
