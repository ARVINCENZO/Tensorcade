import * as React from 'react';
import { Editor, type Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { clsx } from 'clsx';
import {
  TENSORCADE_DARK_THEME_NAME,
  registerTensorcadeTheme,
} from './token-theme.js';
import {
  buildLockedDecorations,
  handleLockedKeyDown,
  isRangeIntersectingLocked,
} from './locked-ranges.js';
import { applyDiagnosticMarkers } from './markers.js';
import type { HackerEditorProps } from './types.js';

const LOCKED_LINE_STYLES = `
.tc-locked-line {
  background-color: rgba(35, 46, 66, 0.4) !important;
}
.tc-locked-gutter {
  background-color: rgba(35, 46, 66, 0.3) !important;
}
.tc-locked-gutter-icon {
  background-repeat: no-repeat;
  background-position: center;
}
`;

/**
 * Responsive Monaco-based Python code editor for Tensorcade Hacker Mode.
 */
export function HackerEditor({
  code,
  onChange,
  lockedRanges = [],
  diagnosticError,
  onRun,
  readOnly = false,
  height = '100%',
  width = '100%',
  className,
  onMount,
}: HackerEditorProps): React.JSX.Element {
  const editorRef = React.useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = React.useRef<Monaco | null>(null);
  const decorationCollectionRef = React.useRef<editor.IEditorDecorationsCollection | null>(null);

  // Keep references to latest callbacks/state without forcing editor re-initialization
  const onRunRef = React.useRef(onRun);
  onRunRef.current = onRun;

  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  const lockedRangesRef = React.useRef(lockedRanges);
  lockedRangesRef.current = lockedRanges;

  const lastValidCodeRef = React.useRef(code);
  lastValidCodeRef.current = code;

  const isRevertingRef = React.useRef(false);

  // Before mount: register Tensorcade dark theme
  const handleBeforeMount = React.useCallback((monaco: Monaco) => {
    registerTensorcadeTheme(monaco);
  }, []);

  // Update locked decorations
  const refreshLockedDecorations = React.useCallback(() => {
    const editorInstance = editorRef.current;
    const monacoInstance = monacoRef.current;
    if (!editorInstance || !monacoInstance) return;

    const decorations = buildLockedDecorations(monacoInstance, lockedRangesRef.current);

    if (decorationCollectionRef.current) {
      decorationCollectionRef.current.set(decorations);
    } else if (typeof editorInstance.createDecorationsCollection === 'function') {
      decorationCollectionRef.current = editorInstance.createDecorationsCollection(decorations);
    }
  }, []);

  // Sync diagnostic error markers whenever error prop changes
  React.useEffect(() => {
    const editorInstance = editorRef.current;
    const monacoInstance = monacoRef.current;
    if (!editorInstance || !monacoInstance) return;

    const model = editorInstance.getModel();
    if (model) {
      applyDiagnosticMarkers(monacoInstance, model, diagnosticError);
    }
  }, [diagnosticError]);

  // Sync locked ranges whenever lockedRanges prop changes
  React.useEffect(() => {
    refreshLockedDecorations();
  }, [lockedRanges, refreshLockedDecorations]);

  // Sync readOnly option
  React.useEffect(() => {
    editorRef.current?.updateOptions({ readOnly });
  }, [readOnly]);

  // On mount handler
  const handleOnMount = React.useCallback(
    (editorInstance: editor.IStandaloneCodeEditor, monacoInstance: Monaco) => {
      editorRef.current = editorInstance;
      monacoRef.current = monacoInstance;

      // Register Ctrl+Enter / Cmd+Enter keybinding for onRun
      editorInstance.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter, () => {
        onRunRef.current?.();
      });

      // Intercept keystrokes that attempt to modify locked regions or run execution
      editorInstance.onKeyDown((e) => {
        // Prevent event propagation on Ctrl+Enter so outer DOM containers do not duplicate run execution
        if ((e.ctrlKey || e.metaKey) && e.browserEvent.key === 'Enter') {
          e.stopPropagation();
        }
        handleLockedKeyDown(e, editorInstance, lockedRangesRef.current);
      });

      // Intercept any content changes that touch locked ranges
      editorInstance.onDidChangeModelContent((e) => {
        if (isRevertingRef.current) {
          return;
        }

        const currentLocked = lockedRangesRef.current;
        if (currentLocked.length > 0) {
          const violatesLock = e.changes.some((change) =>
            isRangeIntersectingLocked(
              {
                startLineNumber: change.range.startLineNumber,
                endLineNumber: change.range.endLineNumber,
              },
              currentLocked
            )
          );

          if (violatesLock) {
            isRevertingRef.current = true;
            try {
              const model = editorInstance.getModel();
              if (model) {
                // Restore model content without wiping undo history
                // Trigger undo first to pop the invalid edit
                if (typeof editorInstance.trigger === 'function') {
                  editorInstance.trigger('tensorcade-lock', 'undo', null);
                }
                // Fallback: if content is still not restored, use pushEditOperations
                // to push an undoable edit operation rather than destroying the undo stack via setValue
                if (model.getValue() !== lastValidCodeRef.current) {
                  model.pushEditOperations(
                    [],
                    [
                      {
                        range: model.getFullModelRange(),
                        text: lastValidCodeRef.current,
                      },
                    ],
                    () => null
                  );
                }
              }
            } finally {
              isRevertingRef.current = false;
            }
            return;
          }
        }

        const newCode = editorInstance.getValue();
        lastValidCodeRef.current = newCode;
        onChangeRef.current?.(newCode);
      });

      // Apply initial locked decorations
      refreshLockedDecorations();

      // Apply initial diagnostic markers if present
      const model = editorInstance.getModel();
      if (model && diagnosticError) {
        applyDiagnosticMarkers(monacoInstance, model, diagnosticError);
      }

      onMount?.(editorInstance, monacoInstance);
    },
    [diagnosticError, onMount, refreshLockedDecorations]
  );

  return (
    <div
      className={clsx(
        'tensorcade-hacker-editor relative w-full h-full min-h-[200px] overflow-hidden rounded-md border border-[#232E42] bg-[#0B0F17]',
        className
      )}
      role="region"
      aria-label="Python Code Editor"
    >
      <style>{LOCKED_LINE_STYLES}</style>
      <Editor
        height={height}
        width={width}
        language="python"
        theme={TENSORCADE_DARK_THEME_NAME}
        value={code}
        beforeMount={handleBeforeMount}
        onMount={handleOnMount}
        options={{
          readOnly,
          automaticLayout: true,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, Consolas, monospace",
          fontSize: 14,
          lineHeight: 22,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          glyphMargin: true,
          lineNumbers: 'on',
          tabSize: 4,
          insertSpaces: true,
          wordWrap: 'on',
          cursorBlinking: 'smooth',
          renderLineHighlight: 'all',
        }}
      />
    </div>
  );
}
