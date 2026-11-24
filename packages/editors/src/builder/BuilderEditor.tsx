import * as React from 'react';
import type { ParsonsBlock } from '@tensorcade/contracts';
import { Button } from '@tensorcade/ui';
import { cn } from '@tensorcade/ui';
import type { BuilderEditorProps, SolutionBlockState } from './types.js';
import {
  assemblePythonCode,
  findPlacedDistractors,
  normalizeIndent,
  parseCodeSegments,
  stepIndentDown,
  stepIndentUp,
  type DistractorInfo,
} from './assembler.js';

export const BuilderEditor: React.FC<BuilderEditorProps> = ({
  blocks,
  initialOrder,
  onChange,
  onRun,
  className,
  readOnly = false,
}) => {
  // Map of all blocks by ID for fast lookup
  const blocksById = React.useMemo(() => {
    const map = new Map<string, ParsonsBlock>();
    for (const b of blocks) {
      map.set(b.id, b);
    }
    return map;
  }, [blocks]);

  // Solution slots (ordered array of placed blocks)
  const [solution, setSolution] = React.useState<SolutionBlockState[]>(() => {
    if (initialOrder && initialOrder.length > 0) {
      return initialOrder.map((item) => ({
        id: item.id,
        indent: normalizeIndent(item.indent),
        blankValues: item.blankValues ? { ...item.blankValues } : {},
      }));
    }
    return [];
  });

  // Track consecutive submissions with distractors (anti-brute-force mechanism)
  const [consecutiveInvalidSubmissions, setConsecutiveInvalidSubmissions] =
    React.useState<number>(0);
  const [activePauseDistractors, setActivePauseDistractors] = React.useState<
    DistractorInfo[] | null
  >(null);

  // Available blocks: blocks in `blocks` that are NOT yet in `solution`
  const availableBlocks = React.useMemo(() => {
    const usedIds = new Set(solution.map((s) => s.id));
    return blocks.filter((b) => !usedIds.has(b.id));
  }, [blocks, solution]);

  // Notify parent of assembled Python code whenever solution changes
  React.useEffect(() => {
    const code = assemblePythonCode(solution, blocksById);
    onChange?.(code);
  }, [solution, blocksById, onChange]);

  // Add block from available tray to bottom of solution canvas
  const handleAddBlock = React.useCallback(
    (blockId: string) => {
      if (readOnly) return;
      setSolution((prev) => [...prev, { id: blockId, indent: 0, blankValues: {} }]);
    },
    [readOnly],
  );

  // Remove block from solution canvas back to available tray
  const handleRemoveBlock = React.useCallback(
    (index: number) => {
      if (readOnly) return;
      setSolution((prev) => prev.filter((_, i) => i !== index));
    },
    [readOnly],
  );

  // Reorder: move block up
  const handleMoveUp = React.useCallback(
    (index: number) => {
      if (readOnly || index <= 0) return;
      setSolution((prev) => {
        const next = [...prev];
        const [item] = next.splice(index, 1);
        if (item) {
          next.splice(index - 1, 0, item);
        }
        return next;
      });
    },
    [readOnly],
  );

  // Reorder: move block down
  const handleMoveDown = React.useCallback(
    (index: number) => {
      if (readOnly) return;
      setSolution((prev) => {
        if (index >= prev.length - 1) return prev;
        const next = [...prev];
        const [item] = next.splice(index, 1);
        if (item) {
          next.splice(index + 1, 0, item);
        }
        return next;
      });
    },
    [readOnly],
  );

  // Indentation adjustments
  const handleIndentChange = React.useCallback(
    (index: number, direction: 'in' | 'out') => {
      if (readOnly) return;
      setSolution((prev) => {
        const item = prev[index];
        if (!item) return prev;
        const nextIndent =
          direction === 'in' ? stepIndentUp(item.indent) : stepIndentDown(item.indent);
        const next = [...prev];
        next[index] = { ...item, indent: nextIndent };
        return next;
      });
    },
    [readOnly],
  );

  // Fill-in-the-blank text inputs
  const handleBlankChange = React.useCallback(
    (slotIndex: number, blankIndex: number, value: string) => {
      if (readOnly) return;
      setSolution((prev) => {
        const item = prev[slotIndex];
        if (!item) return prev;
        const updatedBlanks = {
          ...item.blankValues,
          [String(blankIndex)]: value,
        };
        const next = [...prev];
        next[slotIndex] = { ...item, blankValues: updatedBlanks };
        return next;
      });
    },
    [readOnly],
  );

  // Submission handler with anti-brute-force distractor detection
  const handleRun = React.useCallback(() => {
    const distractors = findPlacedDistractors(solution, blocksById);

    if (distractors.length > 0) {
      const nextCount = consecutiveInvalidSubmissions + 1;
      setConsecutiveInvalidSubmissions(nextCount);

      if (nextCount >= 3) {
        // Trigger anti-brute-force educational pause
        setActivePauseDistractors(distractors);
        return;
      }
    } else {
      // Valid permutation (no distractors placed)
      setConsecutiveInvalidSubmissions(0);
      setActivePauseDistractors(null);
    }

    onRun?.();
  }, [solution, blocksById, consecutiveInvalidSubmissions, onRun]);

  const handleDismissPause = React.useCallback(() => {
    setActivePauseDistractors(null);
  }, []);

  return (
    <div
      className={cn(
        'tc-builder-editor flex flex-col h-full w-full bg-[var(--tc-bg-base)] text-[var(--tc-text-primary)] font-sans',
        className,
      )}
      data-testid="builder-editor"
    >
      {/* Educational Pause Modal / Alert Banner */}
      {activePauseDistractors && (
        <div
          role="alert"
          aria-live="assertive"
          data-testid="educational-pause-banner"
          className="m-4 p-4 border border-[var(--tc-accent-amber)] bg-[var(--tc-bg-surface)] rounded-[var(--tc-radius-md)] shadow-lg"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-bold text-[var(--tc-accent-amber)] flex items-center gap-2">
                <span aria-hidden="true">⚠️</span> Educational Pause: Think Before Guessing
              </h3>
              <p className="mt-1 text-sm text-[var(--tc-text-muted)]">
                You have submitted 3 consecutive attempts containing distractor blocks.
                Brute-forcing permutations is paused to encourage reflection. Review why these
                pieces do not fit:
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDismissPause}
              data-testid="dismiss-pause-btn"
              className="ml-4 shrink-0"
            >
              Resume Editing
            </Button>
          </div>

          <div className="mt-3 space-y-2">
            {activePauseDistractors.map((distractor) => (
              <div
                key={distractor.id}
                className="p-3 bg-[var(--tc-bg-base)] border border-[var(--tc-border-subtle)] rounded-[var(--tc-radius-sm)]"
              >
                <div className="font-mono text-xs text-[var(--tc-accent-crimson)] font-semibold">
                  <code>{distractor.code}</code>
                </div>
                <div className="mt-1 text-xs text-[var(--tc-text-primary)]">
                  {distractor.explanation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editor Header Toolbar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-[var(--tc-border-subtle)] bg-[var(--tc-bg-surface)]">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--tc-accent-cyan)]">
            Builder Mode
          </span>
          <span className="text-xs text-[var(--tc-text-muted)]">
            Parsons Problem Assembly ({solution.length} placed, {availableBlocks.length} available)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {consecutiveInvalidSubmissions > 0 && consecutiveInvalidSubmissions < 3 && (
            <span
              className="text-xs text-[var(--tc-accent-amber)]"
              data-testid="consecutive-warning"
              role="status"
            >
              Notice: Distractor detected ({consecutiveInvalidSubmissions}/3 attempts before pause)
            </span>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleRun}
            disabled={readOnly || solution.length === 0}
            data-testid="builder-run-btn"
          >
            Run Solution
          </Button>
        </div>
      </header>

      {/* Main Two-Column Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 min-h-0 overflow-hidden">
        {/* Left Column: Available Blocks Tray */}
        <section
          aria-labelledby="available-blocks-heading"
          className="flex flex-col bg-[var(--tc-bg-surface)] border border-[var(--tc-border-subtle)] rounded-[var(--tc-radius-md)] p-3 overflow-hidden"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--tc-border-subtle)]">
            <h2
              id="available-blocks-heading"
              className="text-xs font-semibold uppercase text-[var(--tc-text-muted)]"
            >
              Available Blocks ({availableBlocks.length})
            </h2>
          </div>

          <div
            role="list"
            aria-label="Available Blocks Tray"
            className="flex-1 overflow-y-auto space-y-2 pr-1"
            data-testid="available-blocks-tray"
          >
            {availableBlocks.length === 0 ? (
              <div className="text-center py-8 text-xs text-[var(--tc-text-dim)]">
                All available blocks have been placed on the Solution Canvas.
              </div>
            ) : (
              availableBlocks.map((block) => (
                <div
                  key={block.id}
                  role="listitem"
                  className="group flex items-center justify-between p-2.5 bg-[var(--tc-bg-base)] border border-[var(--tc-border-subtle)] rounded-[var(--tc-radius-sm)] hover:border-[var(--tc-accent-cyan)] transition-colors"
                  data-testid={`available-block-${block.id}`}
                >
                  <code className="font-mono text-xs text-[var(--tc-text-primary)] whitespace-pre overflow-x-auto py-1">
                    {block.code}
                  </code>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddBlock(block.id)}
                    disabled={readOnly}
                    aria-label={`Add block ${block.code}`}
                    data-testid={`add-block-btn-${block.id}`}
                    className="ml-2 shrink-0 h-7 px-2 text-xs"
                  >
                    + Add
                  </Button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right Column: Solution Canvas */}
        <section
          aria-labelledby="solution-canvas-heading"
          className="flex flex-col bg-[var(--tc-bg-surface)] border border-[var(--tc-border-subtle)] rounded-[var(--tc-radius-md)] p-3 overflow-hidden"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--tc-border-subtle)]">
            <h2
              id="solution-canvas-heading"
              className="text-xs font-semibold uppercase text-[var(--tc-text-muted)]"
            >
              Solution Canvas ({solution.length} blocks)
            </h2>
            <span className="text-[10px] text-[var(--tc-text-dim)]">
              Indent: 0, 4, 8 spaces | Tab / Shift+Tab supported
            </span>
          </div>

          <div
            role="list"
            aria-label="Solution Canvas Slots"
            className="flex-1 overflow-y-auto space-y-2 pr-1"
            data-testid="solution-canvas"
          >
            {solution.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center h-48 border border-dashed border-[var(--tc-border-subtle)] rounded-[var(--tc-radius-sm)] text-xs text-[var(--tc-text-dim)]"
                data-testid="empty-canvas-placeholder"
              >
                <span>Add blocks from the left tray to construct your solution.</span>
                <span className="mt-1 text-[11px]">
                  Adjust order and indentation to match Python syntax.
                </span>
              </div>
            ) : (
              solution.map((slot, index) => {
                const block = blocksById.get(slot.id);
                if (!block) return null;

                const segments = parseCodeSegments(block.code);
                const indentSpaces = normalizeIndent(slot.indent);

                // Inline padding style representing exact 0, 4, or 8 space indentation
                const indentPaddingPx = indentSpaces === 8 ? 48 : indentSpaces === 4 ? 24 : 8;

                return (
                  <div
                    key={`${slot.id}-${index}`}
                    role="listitem"
                    style={{ paddingLeft: `${indentPaddingPx}px` }}
                    className="relative transition-all"
                    data-testid={`solution-slot-${index}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        if (e.shiftKey) {
                          handleIndentChange(index, 'out');
                        } else {
                          handleIndentChange(index, 'in');
                        }
                      }
                    }}
                  >
                    <div
                      className={cn(
                        'flex flex-col gap-2 p-2.5 bg-[var(--tc-bg-base)] border border-[var(--tc-border-subtle)] rounded-[var(--tc-radius-sm)]',
                        'hover:border-[var(--tc-text-muted)] focus-within:border-[var(--tc-accent-cyan)]',
                      )}
                    >
                      {/* Slot Header: Indent indicator, Reordering, Indenting, Removing */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-[var(--tc-accent-cyan)] font-bold">
                            #{index + 1}
                          </span>
                          <span
                            className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--tc-bg-surface)] text-[var(--tc-text-muted)] border border-[var(--tc-border-subtle)]"
                            data-testid={`slot-${index}-indent-badge`}
                          >
                            Indent: {indentSpaces} sp
                          </span>
                        </div>

                        {/* Control Buttons */}
                        <div className="flex items-center gap-1">
                          {/* Indent buttons */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleIndentChange(index, 'out')}
                            disabled={readOnly || indentSpaces === 0}
                            aria-label={`Unindent block #${index + 1}`}
                            data-testid={`unindent-btn-${index}`}
                            className="h-6 px-1.5 text-[11px]"
                          >
                            &lt; Indent
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleIndentChange(index, 'in')}
                            disabled={readOnly || indentSpaces === 8}
                            aria-label={`Indent block #${index + 1}`}
                            data-testid={`indent-btn-${index}`}
                            className="h-6 px-1.5 text-[11px]"
                          >
                            Indent &gt;
                          </Button>

                          {/* Reorder buttons */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveUp(index)}
                            disabled={readOnly || index === 0}
                            aria-label={`Move up block #${index + 1}`}
                            data-testid={`move-up-btn-${index}`}
                            className="h-6 px-1 text-[11px]"
                          >
                            ▲
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveDown(index)}
                            disabled={readOnly || index === solution.length - 1}
                            aria-label={`Move down block #${index + 1}`}
                            data-testid={`move-down-btn-${index}`}
                            className="h-6 px-1 text-[11px]"
                          >
                            ▼
                          </Button>

                          {/* Remove button */}
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRemoveBlock(index)}
                            disabled={readOnly}
                            aria-label={`Remove block #${index + 1} from solution`}
                            data-testid={`remove-btn-${index}`}
                            className="h-6 px-1.5 text-[11px] ml-1"
                          >
                            ✕
                          </Button>
                        </div>
                      </div>

                      {/* Code body with inline fill-in-the-blank inputs */}
                      <div className="font-mono text-xs flex flex-wrap items-center gap-1 bg-[var(--tc-bg-surface)] p-2 rounded border border-[var(--tc-border-subtle)]">
                        {segments.map((seg, sIdx) => {
                          if (seg.type === 'text') {
                            return (
                              <span
                                key={sIdx}
                                className="whitespace-pre text-[var(--tc-text-primary)]"
                              >
                                {seg.text}
                              </span>
                            );
                          }

                          const blankIndex = seg.index ?? 0;
                          const currentVal =
                            slot.blankValues?.[String(blankIndex)] ??
                            slot.blankValues?.[`blank_${blankIndex}`] ??
                            '';

                          return (
                            <input
                              key={sIdx}
                              type="text"
                              value={currentVal}
                              placeholder="___"
                              disabled={readOnly}
                              aria-label={`Fill in blank ${blankIndex + 1} for block ${slot.id}`}
                              data-testid={`blank-input-${index}-${blankIndex}`}
                              onChange={(e) => handleBlankChange(index, blankIndex, e.target.value)}
                              onInput={(e) =>
                                handleBlankChange(
                                  index,
                                  blankIndex,
                                  (e.target as HTMLInputElement).value,
                                )
                              }
                              className={cn(
                                'h-6 px-1.5 py-0.5 text-xs font-mono rounded border',
                                'bg-[var(--tc-bg-base)] text-[var(--tc-accent-cyan)] border-[var(--tc-accent-cyan)]',
                                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--tc-accent-cyan)] focus-visible:outline-offset-[var(--tc-focus-outline-offset)]',
                                'min-w-[4rem] max-w-[8rem]',
                              )}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
