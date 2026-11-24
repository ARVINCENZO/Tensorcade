import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { DiagnosticError } from '@tensorcade/contracts';
import type { editor, IKeyboardEvent } from 'monaco-editor';
import type { Monaco } from '@monaco-editor/react';
import {
  TENSORCADE_DARK_THEME_NAME,
  tensorcadeDarkTheme,
  registerTensorcadeTheme,
} from './token-theme.js';
import {
  isRangeIntersectingLocked,
  isLineInRange,
  buildLockedDecorations,
  handleLockedKeyDown,
} from './locked-ranges.js';
import {
  TENSORCADE_MARKER_OWNER,
  formatDiagnosticMarkerMessage,
  applyDiagnosticMarkers,
} from './markers.js';
import { HackerEditor } from './HackerEditor.js';

describe('Monaco Hacker Editor (Sub-step 5b.1)', () => {
  describe('Theme: tensorcade-dark', () => {
    it('defines base vs-dark with correct dark palette tokens', () => {
      expect(TENSORCADE_DARK_THEME_NAME).toBe('tensorcade-dark');
      expect(tensorcadeDarkTheme.base).toBe('vs-dark');
      expect(tensorcadeDarkTheme.inherit).toBe(true);

      const colors = tensorcadeDarkTheme.colors;
      expect(colors['editor.background']).toBe('#0B0F17');
      expect(colors['editorCursor.foreground']).toBe('#00F0FF');
      expect(colors['editor.selectionBackground']).toBe('#00F0FF26');
      expect(colors['editorLineNumber.foreground']).toBe('#4B5563');
      expect(colors['editorLineNumber.activeForeground']).toBe('#00F0FF');
    });

    it('defines specified syntax token rules', () => {
      const rules = tensorcadeDarkTheme.rules;

      // Keywords: #00F0FF
      const keywordRule = rules.find((r) => r.token === 'keyword');
      expect(keywordRule).toBeDefined();
      expect(keywordRule?.foreground?.toUpperCase()).toBe('00F0FF');

      // Functions / Defs: #00E599
      const funcRule = rules.find((r) => r.token === 'entity.name.function');
      expect(funcRule).toBeDefined();
      expect(funcRule?.foreground?.toUpperCase()).toBe('00E599');

      // Strings: #FFB800
      const stringRule = rules.find((r) => r.token === 'string');
      expect(stringRule).toBeDefined();
      expect(stringRule?.foreground?.toUpperCase()).toBe('FFB800');

      // Comments: #64748B
      const commentRule = rules.find((r) => r.token === 'comment');
      expect(commentRule).toBeDefined();
      expect(commentRule?.foreground?.toUpperCase()).toBe('64748B');
    });

    it('registerTensorcadeTheme calls monaco.editor.defineTheme', () => {
      const defineTheme = vi.fn();
      const mockMonaco = { editor: { defineTheme } };

      registerTensorcadeTheme(mockMonaco);
      expect(defineTheme).toHaveBeenCalledWith('tensorcade-dark', tensorcadeDarkTheme);
    });
  });

  describe('Locked Ranges & Enforcement', () => {
    const lockedRanges = [
      { startLine: 1, endLine: 3 },
      { startLine: 8, endLine: 10 },
    ];

    it('isLineInRange accurately checks 1-indexed line containment', () => {
      expect(isLineInRange(1, lockedRanges)).toBe(true);
      expect(isLineInRange(2, lockedRanges)).toBe(true);
      expect(isLineInRange(3, lockedRanges)).toBe(true);
      expect(isLineInRange(4, lockedRanges)).toBe(false);
      expect(isLineInRange(7, lockedRanges)).toBe(false);
      expect(isLineInRange(8, lockedRanges)).toBe(true);
      expect(isLineInRange(10, lockedRanges)).toBe(true);
      expect(isLineInRange(11, lockedRanges)).toBe(false);
    });

    it('isRangeIntersectingLocked detects range collisions accurately', () => {
      // Inside first locked range
      expect(
        isRangeIntersectingLocked({ startLineNumber: 2, endLineNumber: 2 }, lockedRanges),
      ).toBe(true);

      // Straddling boundary
      expect(
        isRangeIntersectingLocked({ startLineNumber: 3, endLineNumber: 5 }, lockedRanges),
      ).toBe(true);
      expect(
        isRangeIntersectingLocked({ startLineNumber: 0, endLineNumber: 1 }, lockedRanges),
      ).toBe(true);

      // Spanning completely over a locked range
      expect(
        isRangeIntersectingLocked({ startLineNumber: 0, endLineNumber: 12 }, lockedRanges),
      ).toBe(true);

      // Safe region in between
      expect(
        isRangeIntersectingLocked({ startLineNumber: 4, endLineNumber: 7 }, lockedRanges),
      ).toBe(false);

      // Safe region after
      expect(
        isRangeIntersectingLocked({ startLineNumber: 11, endLineNumber: 15 }, lockedRanges),
      ).toBe(false);
    });

    it('buildLockedDecorations maps locked ranges to Monaco whole-line decorations', () => {
      const mockRangeConstructor = vi.fn((start, startCol, end, endCol) => ({
        startLineNumber: start,
        startColumn: startCol,
        endLineNumber: end,
        endColumn: endCol,
      }));

      const mockMonaco = {
        Range: mockRangeConstructor,
        editor: {
          TrackedRangeStickiness: { NeverGrowsWhenTypingAtEdges: 1 },
        },
      } as unknown as Monaco;

      const decorations = buildLockedDecorations(mockMonaco, [{ startLine: 1, endLine: 2 }]);
      expect(decorations).toHaveLength(1);
      expect(decorations[0]?.options.isWholeLine).toBe(true);
      expect(decorations[0]?.options.className).toBe('tc-locked-line');
      expect(decorations[0]?.options.glyphMarginClassName).toBe('tc-locked-gutter');
    });

    it('handleLockedKeyDown blocks modification keystrokes in locked ranges', () => {
      const mockEditor = {
        getSelection: vi.fn(() => ({
          startLineNumber: 2,
          endLineNumber: 2,
        })),
      } as unknown as editor.IStandaloneCodeEditor;

      const preventDefault = vi.fn();
      const stopPropagation = vi.fn();

      const mockEvent = {
        ctrlKey: false,
        metaKey: false,
        browserEvent: { key: 'a' },
        preventDefault,
        stopPropagation,
      } as unknown as IKeyboardEvent;

      const intercepted = handleLockedKeyDown(mockEvent, mockEditor, [
        { startLine: 1, endLine: 3 },
      ]);
      expect(intercepted).toBe(true);
      expect(preventDefault).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
    });

    it('handleLockedKeyDown permits navigation and copy in locked ranges', () => {
      const mockEditor = {
        getSelection: vi.fn(() => ({
          startLineNumber: 2,
          endLineNumber: 2,
        })),
      } as unknown as editor.IStandaloneCodeEditor;

      const preventDefault = vi.fn();
      const stopPropagation = vi.fn();

      // Navigation: ArrowDown
      const navEvent = {
        ctrlKey: false,
        metaKey: false,
        browserEvent: { key: 'ArrowDown' },
        preventDefault,
        stopPropagation,
      } as unknown as IKeyboardEvent;

      const interceptedNav = handleLockedKeyDown(navEvent, mockEditor, [
        { startLine: 1, endLine: 3 },
      ]);
      expect(interceptedNav).toBe(false);
      expect(preventDefault).not.toHaveBeenCalled();

      // Copy: Ctrl+C
      const copyEvent = {
        ctrlKey: true,
        metaKey: false,
        browserEvent: { key: 'c' },
        preventDefault,
        stopPropagation,
      } as unknown as IKeyboardEvent;

      const interceptedCopy = handleLockedKeyDown(copyEvent, mockEditor, [
        { startLine: 1, endLine: 3 },
      ]);
      expect(interceptedCopy).toBe(false);
      expect(preventDefault).not.toHaveBeenCalled();
    });

    it('handleLockedKeyDown permits typing outside locked ranges', () => {
      const mockEditor = {
        getSelection: vi.fn(() => ({
          startLineNumber: 5,
          endLineNumber: 5,
        })),
      } as unknown as editor.IStandaloneCodeEditor;

      const preventDefault = vi.fn();
      const mockEvent = {
        ctrlKey: false,
        metaKey: false,
        browserEvent: { key: 'x' },
        preventDefault,
        stopPropagation: vi.fn(),
      } as unknown as IKeyboardEvent;

      const intercepted = handleLockedKeyDown(mockEvent, mockEditor, [
        { startLine: 1, endLine: 3 },
      ]);
      expect(intercepted).toBe(false);
      expect(preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('Pedagogical Diagnostic Markers', () => {
    const diagnosticError: DiagnosticError = {
      errorType: 'IndexError',
      whatHappened: 'list index out of range at index 5',
      whereItOccurred: {
        line: 4,
        column: 8,
        sourceSnippet: '    item = items[5]',
      },
      whyItMatters: 'List indexing requires 0 <= index < len(items).',
      whatToInvestigate: 'Check the length of items before accessing index 5.',
    };

    it('formatDiagnosticMarkerMessage constructs comprehensive 4-part message', () => {
      const message = formatDiagnosticMarkerMessage(diagnosticError);
      expect(message).toContain('IndexError: list index out of range');
      expect(message).toContain('[Why this matters]');
      expect(message).toContain('List indexing requires 0 <= index < len(items).');
      expect(message).toContain('[What to investigate]');
      expect(message).toContain('Check the length of items before accessing index 5.');
    });

    it('applyDiagnosticMarkers sets model markers on target line and column', () => {
      const setModelMarkers = vi.fn();
      const mockMonaco = {
        editor: { setModelMarkers },
        MarkerSeverity: { Error: 8 },
      } as unknown as Monaco;

      const mockModel = {
        getLineCount: vi.fn(() => 10),
        getLineMaxColumn: vi.fn(() => 25),
      } as unknown as editor.ITextModel;

      applyDiagnosticMarkers(mockMonaco, mockModel, diagnosticError);

      expect(setModelMarkers).toHaveBeenCalledTimes(1);
      const call = setModelMarkers.mock.calls[0];
      expect(call).toBeDefined();
      if (!call) throw new Error('Expected setModelMarkers to have been called');

      const [modelArg, ownerArg, markersArg] = call;
      expect(modelArg).toBe(mockModel);
      expect(ownerArg).toBe(TENSORCADE_MARKER_OWNER);
      expect(markersArg).toHaveLength(1);

      const marker = markersArg[0];
      expect(marker.startLineNumber).toBe(4);
      expect(marker.startColumn).toBe(8);
      expect(marker.endLineNumber).toBe(4);
      expect(marker.endColumn).toBe(25);
      expect(marker.severity).toBe(8);
    });

    it('applyDiagnosticMarkers clears markers when diagnosticError is undefined', () => {
      const setModelMarkers = vi.fn();
      const mockMonaco = {
        editor: { setModelMarkers },
        MarkerSeverity: { Error: 8 },
      } as unknown as Monaco;

      const mockModel = {
        getLineCount: vi.fn(() => 10),
        getLineMaxColumn: vi.fn(() => 25),
      } as unknown as editor.ITextModel;

      applyDiagnosticMarkers(mockMonaco, mockModel, undefined);
      expect(setModelMarkers).toHaveBeenCalledWith(mockModel, TENSORCADE_MARKER_OWNER, []);
    });

    it('applyDiagnosticMarkers clamps line and column to valid bounds', () => {
      const setModelMarkers = vi.fn();
      const mockMonaco = {
        editor: { setModelMarkers },
        MarkerSeverity: { Error: 8 },
      } as unknown as Monaco;

      const mockModel = {
        getLineCount: vi.fn(() => 5), // only 5 lines in model
        getLineMaxColumn: vi.fn(() => 15),
      } as unknown as editor.ITextModel;

      const outOfBoundsError: DiagnosticError = {
        ...diagnosticError,
        whereItOccurred: { line: 99, column: 50, sourceSnippet: '' },
      };

      applyDiagnosticMarkers(mockMonaco, mockModel, outOfBoundsError);

      const call = setModelMarkers.mock.calls[0];
      expect(call).toBeDefined();
      if (!call) throw new Error('Expected setModelMarkers to have been called');

      const markersArg = call[2];
      expect(markersArg?.[0]?.startLineNumber).toBe(5); // clamped to 5
      expect(markersArg?.[0]?.startColumn).toBe(15); // clamped to max column 15
    });
  });

  describe('Component Rendering', () => {
    it('renders HackerEditor container with accessible region role and label', () => {
      const html = renderToStaticMarkup(
        <HackerEditor
          code="print('hello tensorcade')"
          height="300px"
          className="custom-editor-class"
        />,
      );

      expect(html).toContain('role="region"');
      expect(html).toContain('aria-label="Python Code Editor"');
      expect(html).toContain('custom-editor-class');
      expect(html).toContain('tc-locked-line');
    });
  });
});
