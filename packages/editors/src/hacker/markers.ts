import type { DiagnosticError } from '@tensorcade/contracts';
import type { editor } from 'monaco-editor';
import type { Monaco } from '@monaco-editor/react';

/** Owner identifier for Tensorcade diagnostic markers in Monaco. */
export const TENSORCADE_MARKER_OWNER = 'tensorcade-diagnostics';

/**
 * Formats a 4-part pedagogical DiagnosticError into an accessible Monaco error message.
 */
export function formatDiagnosticMarkerMessage(diagnostic: DiagnosticError): string {
  const parts: string[] = [`${diagnostic.errorType}: ${diagnostic.whatHappened}`];

  if (diagnostic.whyItMatters.trim().length > 0) {
    parts.push(`\n\n[Why this matters]\n${diagnostic.whyItMatters}`);
  }

  if (diagnostic.whatToInvestigate.trim().length > 0) {
    parts.push(`\n\n[What to investigate]\n${diagnostic.whatToInvestigate}`);
  }

  return parts.join('');
}

/**
 * Applies or clears pedagogical error markers and red squigglies on the Monaco model.
 */
export function applyDiagnosticMarkers(
  monacoInstance: Monaco,
  model: editor.ITextModel,
  diagnosticError?: DiagnosticError | undefined,
): void {
  if (!diagnosticError) {
    monacoInstance.editor.setModelMarkers(model, TENSORCADE_MARKER_OWNER, []);
    return;
  }

  const lineCount = Math.max(1, model.getLineCount());
  const rawLine = diagnosticError.whereItOccurred.line;
  const targetLine = Math.min(Math.max(1, rawLine), lineCount);

  const rawCol = diagnosticError.whereItOccurred.column;
  const maxCol = model.getLineMaxColumn(targetLine);
  const targetStartCol = Math.min(Math.max(1, rawCol), maxCol);

  // Squiggle from the error column to the end of the line (or at least 1 character wide)
  const targetEndCol = Math.max(targetStartCol + 1, maxCol);

  const marker: editor.IMarkerData = {
    startLineNumber: targetLine,
    startColumn: targetStartCol,
    endLineNumber: targetLine,
    endColumn: targetEndCol,
    message: formatDiagnosticMarkerMessage(diagnosticError),
    severity: monacoInstance.MarkerSeverity.Error,
  };

  monacoInstance.editor.setModelMarkers(model, TENSORCADE_MARKER_OWNER, [marker]);
}
