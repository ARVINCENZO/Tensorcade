import * as React from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@tensorcade/ui';
import type { IncompatibleTransitionModalProps } from './types.js';

/**
 * Non-destructive confirmation dialog when switching from Hacker Mode to Explorer/Builder.
 *
 * Pedagogical Requirement (Sub-step 5b.4):
 * Documents that arbitrary Python cannot round-trip back into blocks,
 * and assures the learner their Hacker code remains safely preserved in memory.
 */
export function IncompatibleTransitionModal({
  isOpen,
  onConfirm,
  onCancel,
  targetMode = 'explorer',
  className,
}: IncompatibleTransitionModalProps): React.JSX.Element {
  const targetLabel = targetMode === 'builder' ? 'Builder (Parsons)' : 'Explorer (Blocks)';

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
    >
      <DialogContent className={className} aria-describedby="incompatible-transition-description">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-flex items-center rounded-[var(--tc-radius-sm)] bg-[var(--tc-accent-amber)] px-2 py-0.5 text-xs font-mono font-bold text-[var(--tc-bg-base)] uppercase tracking-wide"
              aria-hidden="true"
            >
              [CODE PRESERVATION]
            </span>
          </div>
          <DialogTitle className="text-base font-semibold text-[var(--tc-text-primary)]">
            Switch to {targetLabel}?
          </DialogTitle>
        </DialogHeader>

        <DialogDescription asChild>
          <div
            id="incompatible-transition-description"
            className="text-sm text-[var(--tc-text-muted)] space-y-3"
          >
            <p>
              Arbitrary Python code written in <strong>Hacker Mode</strong> cannot automatically
              round-trip back into visual blocks or Parsons puzzles.
            </p>
            <div className="rounded-[var(--tc-radius-sm)] border border-[var(--tc-border-subtle)] bg-[var(--tc-bg-base)] p-3 text-xs font-mono text-[var(--tc-text-muted)] space-y-1">
              <div className="flex items-center gap-1.5 text-[var(--tc-accent-emerald)] font-semibold">
                <span aria-hidden="true">✓</span>
                <span>Your Hacker code remains safely preserved.</span>
              </div>
              <p className="text-[var(--tc-text-muted)] pl-4">
                All your custom lines and edits are stored in memory. You can return to Hacker Mode
                at any time without losing your work.
              </p>
            </div>
          </div>
        </DialogDescription>

        <DialogFooter className="mt-4 gap-2 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Keep Editing in Hacker
          </Button>
          <Button variant="primary" size="sm" onClick={onConfirm}>
            Switch to {targetMode === 'builder' ? 'Builder' : 'Explorer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
