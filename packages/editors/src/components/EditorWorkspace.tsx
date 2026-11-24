import * as React from 'react';
import type { DiagnosticError, ParsonsBlock, PlayMode } from '@tensorcade/contracts';
import type { LevelManifest } from '@tensorcade/levels';
import { Button, cn } from '@tensorcade/ui';
import type { editor } from 'monaco-editor';
import type { Monaco } from '@monaco-editor/react';

import { ModeSwitcher } from '../switcher/ModeSwitcher.js';
import { IncompatibleTransitionModal } from '../switcher/IncompatibleTransitionModal.js';
import { GraduationPromptModal } from '../switcher/GraduationPromptModal.js';
import { HackerEditor } from '../hacker/HackerEditor.js';
import type { LockedRange } from '../hacker/types.js';
import { ExplorerEditor } from '../explorer/ExplorerEditor.js';
import { BuilderEditor } from '../builder/BuilderEditor.js';
import { ErrorFeedbackPanel } from '../diagnostics/ErrorFeedbackPanel.js';

export interface EditorWorkspaceProps {
  /** Controlled active play mode */
  readonly mode?: PlayMode | undefined;
  /** Initial mode for uncontrolled usage (defaults to first supported mode or 'explorer') */
  readonly defaultMode?: PlayMode | undefined;
  /** Callback fired when mode changes */
  readonly onModeChange?: ((mode: PlayMode) => void) | undefined;
  /** Supported play modes for the current level (filters switcher tabs) */
  readonly supportedModes?: ReadonlyArray<PlayMode> | undefined;
  /** Level manifest containing level config and metadata */
  readonly level?: LevelManifest | undefined;

  /** Initial Python code for Hacker mode */
  readonly initialCode?: string | undefined;
  /** Starter code per mode from level definition */
  readonly starterCode?:
    | {
        readonly explorer?: string | undefined;
        readonly builder?: string | undefined;
        readonly hacker?: string | undefined;
      }
    | undefined;

  /** Parsons blocks for Builder mode */
  readonly parsonsBlocks?: ParsonsBlock[] | undefined;

  /** Blockly toolbox XML/JSON for Explorer mode */
  readonly blocklyToolbox?: object | string | undefined;
  /** Initial Blockly workspace XML */
  readonly initialBlocklyXml?: string | undefined;

  /** Locked line ranges for Hacker mode */
  readonly lockedRanges?: ReadonlyArray<LockedRange> | undefined;

  /** Active diagnostic failure error payload */
  readonly diagnosticError?: DiagnosticError | undefined;
  /** Callback invoked when learner dismisses diagnostic error */
  readonly onDismissDiagnosticError?: (() => void) | undefined;

  /** Callback fired whenever Python code updates in the active mode */
  readonly onCodeChange?: ((code: string, mode: PlayMode) => void) | undefined;
  /** Callback triggered when learner runs code */
  readonly onRun?: ((code: string, mode: PlayMode) => void) | undefined;
  /** Callback triggered when learner jumps to line */
  readonly onJumpToLine?: ((line: number, column: number) => void) | undefined;

  /** Whether the workspace is read-only */
  readonly readOnly?: boolean | undefined;

  /** Graduation prompt modal state */
  readonly isGraduationOpen?: boolean | undefined;
  readonly onGraduationDismiss?: (() => void) | undefined;
  readonly onGraduationConfirm?: (() => void) | undefined;

  readonly className?: string | undefined;
}

/**
 * Unified Editor Workspace integrating ModeSwitcher, HackerEditor, ExplorerEditor,
 * BuilderEditor, and ErrorFeedbackPanel.
 *
 * Implements Sub-step 5b.4:
 * 1. Mode Switching filtered by level supported modes.
 * 2. Forward Intent Preservation (Explorer -> Hacker and Builder -> Hacker).
 * 3. Backward Incompatible Transition Modal (safely preserving Hacker code).
 * 4. Graduation Prompt Modal (challenging learner to prove Hacker Mastery).
 * 5. Jump to Line error navigation focusing the Monaco editor line.
 */
export function EditorWorkspace({
  mode: controlledMode,
  defaultMode,
  onModeChange,
  supportedModes,
  level,
  initialCode,
  starterCode,
  parsonsBlocks,
  blocklyToolbox,
  initialBlocklyXml,
  lockedRanges,
  diagnosticError,
  onDismissDiagnosticError,
  onCodeChange,
  onRun,
  onJumpToLine,
  readOnly = false,
  isGraduationOpen = false,
  onGraduationDismiss,
  onGraduationConfirm,
  className,
}: EditorWorkspaceProps): React.JSX.Element {
  // Determine effective supported modes
  const effectiveSupportedModes: ReadonlyArray<PlayMode> = React.useMemo(() => {
    if (supportedModes && supportedModes.length > 0) {
      return supportedModes;
    }
    if (level?.supportedModes && level.supportedModes.length > 0) {
      return level.supportedModes as ReadonlyArray<PlayMode>;
    }
    return ['explorer', 'builder', 'hacker'] as const;
  }, [supportedModes, level]);

  // Active mode state (controlled or uncontrolled)
  const [internalMode, setInternalMode] = React.useState<PlayMode>(() => {
    if (defaultMode && effectiveSupportedModes.includes(defaultMode)) {
      return defaultMode;
    }
    return (effectiveSupportedModes[0] ?? 'explorer') as PlayMode;
  });

  const activeMode = controlledMode ?? internalMode;

  const setActiveMode = React.useCallback(
    (nextMode: PlayMode) => {
      if (controlledMode === undefined) {
        setInternalMode(nextMode);
      }
      onModeChange?.(nextMode);
    },
    [controlledMode, onModeChange],
  );

  // Starter code resolution
  const resolvedStarterHacker =
    initialCode ?? starterCode?.hacker ?? level?.starterCode?.hacker ?? '';
  const resolvedStarterExplorer =
    initialBlocklyXml ?? starterCode?.explorer ?? level?.starterCode?.explorer ?? '';

  // Mode code states
  const [explorerCode, setExplorerCode] = React.useState<string>('');
  const [explorerXml, setExplorerXml] = React.useState<string>(resolvedStarterExplorer);
  const [builderCode, setBuilderCode] = React.useState<string>('');
  const [hackerCode, setHackerCode] = React.useState<string>(resolvedStarterHacker);

  // Track if learner modified Hacker mode code
  const [hackerIsDirty, setHackerIsDirty] = React.useState<boolean>(false);
  const lastInheritedCodeRef = React.useRef<string>(resolvedStarterHacker);

  // Incompatible Transition confirmation modal state
  const [isIncompatibleModalOpen, setIsIncompatibleModalOpen] = React.useState<boolean>(false);
  const [pendingModeTransition, setPendingModeTransition] = React.useState<PlayMode | null>(null);

  // Monaco editor instance and pending jump target
  const monacoEditorRef = React.useRef<editor.IStandaloneCodeEditor | null>(null);
  const pendingJumpRef = React.useRef<{ line: number; column: number } | null>(null);

  // Execute pending jump-to-line on Monaco editor
  const executeJump = React.useCallback(
    (editorInstance: editor.IStandaloneCodeEditor, line: number, col: number) => {
      editorInstance.revealPositionInCenter({ lineNumber: line, column: col });
      editorInstance.setPosition({ lineNumber: line, column: col });
      editorInstance.focus();
    },
    [],
  );

  // Handle Monaco onMount hook
  const handleHackerMount = React.useCallback(
    (editorInstance: editor.IStandaloneCodeEditor, _monacoInstance: Monaco) => {
      monacoEditorRef.current = editorInstance;
      if (pendingJumpRef.current) {
        const { line, column } = pendingJumpRef.current;
        executeJump(editorInstance, line, column);
        pendingJumpRef.current = null;
      }
    },
    [executeJump],
  );

  // Handle Jump to Line from ErrorFeedbackPanel
  const handleJumpToLine = React.useCallback(
    (line: number, column: number) => {
      onJumpToLine?.(line, column);

      if (activeMode !== 'hacker') {
        // Switch to Hacker mode to show code line
        pendingJumpRef.current = { line, column };
        setActiveMode('hacker');
      } else if (monacoEditorRef.current) {
        executeJump(monacoEditorRef.current, line, column);
      }
    },
    [activeMode, executeJump, onJumpToLine, setActiveMode],
  );

  // Perform mode transition with forward intent preservation
  const executeModeSwitch = React.useCallback(
    (targetMode: PlayMode) => {
      // Forward Intent Preservation: Explorer -> Hacker or Builder -> Hacker
      if (targetMode === 'hacker') {
        if (!hackerIsDirty) {
          let codeToInherit = '';
          if (activeMode === 'explorer' && explorerCode.trim().length > 0) {
            codeToInherit = explorerCode;
          } else if (activeMode === 'builder' && builderCode.trim().length > 0) {
            codeToInherit = builderCode;
          }

          if (codeToInherit) {
            setHackerCode(codeToInherit);
            lastInheritedCodeRef.current = codeToInherit;
            onCodeChange?.(codeToInherit, 'hacker');
          }
        }
      }

      setActiveMode(targetMode);
    },
    [activeMode, builderCode, explorerCode, hackerIsDirty, onCodeChange, setActiveMode],
  );

  // Request mode change (intercepts Hacker -> visual transitions if code was modified)
  const handleRequestModeChange = React.useCallback(
    (targetMode: PlayMode) => {
      if (targetMode === activeMode) return;

      // Check if transitioning away from Hacker mode with modified code
      if (activeMode === 'hacker' && (targetMode === 'explorer' || targetMode === 'builder')) {
        if (hackerIsDirty) {
          setPendingModeTransition(targetMode);
          setIsIncompatibleModalOpen(true);
          return;
        }
      }

      executeModeSwitch(targetMode);
    },
    [activeMode, executeModeSwitch, hackerIsDirty],
  );

  // Confirm incompatible transition (preserves Hacker code in state!)
  const handleConfirmIncompatibleTransition = React.useCallback(() => {
    setIsIncompatibleModalOpen(false);
    if (pendingModeTransition) {
      executeModeSwitch(pendingModeTransition);
      setPendingModeTransition(null);
    }
  }, [executeModeSwitch, pendingModeTransition]);

  // Cancel incompatible transition
  const handleCancelIncompatibleTransition = React.useCallback(() => {
    setIsIncompatibleModalOpen(false);
    setPendingModeTransition(null);
  }, []);

  // Graduation flow: accept challenge and switch to Hacker mode with preserved code
  const handleGraduate = React.useCallback(() => {
    onGraduationConfirm?.();
    // Always pre-populate Hacker mode with winning solution upon graduation
    let winningCode = '';
    if (activeMode === 'explorer' && explorerCode.trim().length > 0) {
      winningCode = explorerCode;
    } else if (activeMode === 'builder' && builderCode.trim().length > 0) {
      winningCode = builderCode;
    }

    if (winningCode) {
      setHackerCode(winningCode);
      lastInheritedCodeRef.current = winningCode;
      setHackerIsDirty(false); // Fresh graduation state
      onCodeChange?.(winningCode, 'hacker');
    }

    setActiveMode('hacker');
  }, [activeMode, builderCode, explorerCode, onCodeChange, onGraduationConfirm, setActiveMode]);

  // Code change handlers
  const handleExplorerChange = React.useCallback(
    (code: string, xml: string) => {
      setExplorerCode(code);
      setExplorerXml(xml);
      if (activeMode === 'explorer') {
        onCodeChange?.(code, 'explorer');
      }
    },
    [activeMode, onCodeChange],
  );

  const handleBuilderChange = React.useCallback(
    (code: string) => {
      setBuilderCode(code);
      if (activeMode === 'builder') {
        onCodeChange?.(code, 'builder');
      }
    },
    [activeMode, onCodeChange],
  );

  const handleHackerChange = React.useCallback(
    (code: string) => {
      setHackerCode(code);
      if (code !== lastInheritedCodeRef.current) {
        setHackerIsDirty(true);
      }
      if (activeMode === 'hacker') {
        onCodeChange?.(code, 'hacker');
      }
    },
    [activeMode, onCodeChange],
  );

  // Run execution handler
  const handleRun = React.useCallback(() => {
    let currentCode = '';
    if (activeMode === 'explorer') {
      currentCode = explorerCode;
    } else if (activeMode === 'builder') {
      currentCode = builderCode;
    } else {
      currentCode = hackerCode;
    }
    onRun?.(currentCode, activeMode);
  }, [activeMode, builderCode, explorerCode, hackerCode, onRun]);

  return (
    <div
      className={cn(
        'tc-editor-workspace flex flex-col w-full h-full bg-[var(--tc-bg-base)] text-[var(--tc-text-primary)] overflow-hidden',
        className,
      )}
      data-testid="editor-workspace"
      tabIndex={-1}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          // If the event originated inside Monaco, Monaco's internal command handler owns execution
          if ((e.target as HTMLElement)?.closest?.('.monaco-editor')) {
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          handleRun();
        }
      }}
    >
      {/* Top Workspace Header Bar */}
      <header className="flex items-center justify-between px-3 py-2 border-b border-[var(--tc-border-subtle)] bg-[var(--tc-bg-surface)] shrink-0 gap-2">
        <div className="flex items-center gap-3">
          <ModeSwitcher
            currentMode={activeMode}
            supportedModes={effectiveSupportedModes}
            onModeChange={handleRequestModeChange}
            disabled={readOnly}
          />
          {level?.title ? (
            <span className="text-xs font-mono font-semibold text-[var(--tc-text-muted)] hidden sm:inline">
              {level.title}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {onRun ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleRun}
              disabled={readOnly}
              className="gap-1.5 font-mono text-xs shadow-sm"
              title="Execute code (Ctrl+Enter / Cmd+Enter)"
            >
              <span>Run Code</span>
              <kbd className="hidden sm:inline-block rounded px-1 text-[10px] bg-[var(--tc-bg-base)]/40 text-[var(--tc-text-primary)]">
                Ctrl+↵
              </kbd>
            </Button>
          ) : null}
        </div>
      </header>

      {/* Main Mode Editor Area */}
      <div
        role="region"
        aria-label="Code editor"
        className="flex-1 relative overflow-hidden w-full h-full"
      >
        {activeMode === 'explorer' && (
          <div
            id="tc-mode-panel-explorer"
            role="tabpanel"
            aria-labelledby="tc-mode-tab-explorer"
            className="w-full h-full"
          >
            <ExplorerEditor
              toolboxXml={blocklyToolbox ?? level?.blocklyToolbox}
              initialXml={explorerXml}
              onChange={handleExplorerChange}
              onRun={handleRun}
              readOnly={readOnly}
              className="w-full h-full"
            />
          </div>
        )}

        {activeMode === 'builder' && (
          <div
            id="tc-mode-panel-builder"
            role="tabpanel"
            aria-labelledby="tc-mode-tab-builder"
            className="w-full h-full"
          >
            <BuilderEditor
              blocks={parsonsBlocks ?? level?.parsonsBlocks ?? []}
              onChange={handleBuilderChange}
              onRun={handleRun}
              readOnly={readOnly}
              className="w-full h-full"
            />
          </div>
        )}

        {activeMode === 'hacker' && (
          <div
            id="tc-mode-panel-hacker"
            role="tabpanel"
            aria-labelledby="tc-mode-tab-hacker"
            className="w-full h-full"
          >
            <HackerEditor
              code={hackerCode}
              onChange={handleHackerChange}
              lockedRanges={lockedRanges}
              diagnosticError={diagnosticError}
              onRun={handleRun}
              onMount={handleHackerMount}
              readOnly={readOnly}
              height="100%"
              width="100%"
              className="w-full h-full border-none rounded-none"
            />
          </div>
        )}
      </div>

      {/* Bottom Diagnostic Error Feedback Panel */}
      {diagnosticError ? (
        <div className="shrink-0 p-2 border-t border-[var(--tc-border-subtle)] bg-[var(--tc-bg-surface)] max-h-[40%] overflow-y-auto">
          <ErrorFeedbackPanel
            error={diagnosticError}
            onJumpToLine={handleJumpToLine}
            onDismiss={onDismissDiagnosticError}
          />
        </div>
      ) : null}

      {/* Incompatible Transition Confirmation Modal */}
      <IncompatibleTransitionModal
        isOpen={isIncompatibleModalOpen}
        onConfirm={handleConfirmIncompatibleTransition}
        onCancel={handleCancelIncompatibleTransition}
        targetMode={pendingModeTransition ?? undefined}
      />

      {/* Graduation Prompt Modal */}
      <GraduationPromptModal
        isOpen={isGraduationOpen}
        onGraduate={handleGraduate}
        onDismiss={onGraduationDismiss ?? (() => {})}
        completedMode={activeMode}
      />
    </div>
  );
}
