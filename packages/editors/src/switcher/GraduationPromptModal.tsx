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
import type { GraduationPromptModalProps } from './types.js';

/**
 * Graduation Prompt Modal celebrating completion in Explorer/Builder mode
 * and challenging the learner to write production Python in Hacker Mode.
 *
 * Implements docs/02-learning-design.md §5.4:
 * "You solved the logic. Now prove you can write production Python in Hacker Mode to earn the Command Crest (Hacker Mastery)."
 */
export function GraduationPromptModal({
  isOpen,
  onGraduate,
  onDismiss,
  completedMode = 'explorer',
  className,
}: GraduationPromptModalProps): React.JSX.Element {
  const modeLabel = completedMode === 'builder' ? 'Builder Mode' : 'Explorer Mode';

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onDismiss();
        }
      }}
    >
      <DialogContent
        className={className}
        aria-describedby="graduation-prompt-description"
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-flex items-center rounded-[var(--tc-radius-sm)] bg-[var(--tc-accent-cyan)] px-2 py-0.5 text-xs font-mono font-bold text-[var(--tc-bg-base)] uppercase tracking-wide"
              aria-hidden="true"
            >
              [LOGIC SOLVED]
            </span>
            <span className="text-xs font-mono text-[var(--tc-text-muted)]">
              Cleared in {modeLabel}
            </span>
          </div>
          <DialogTitle className="text-lg font-bold text-[var(--tc-text-primary)]">
            Prove Hacker Mastery
          </DialogTitle>
        </DialogHeader>

        <DialogDescription asChild>
          <div
            id="graduation-prompt-description"
            className="text-sm text-[var(--tc-text-muted)] space-y-3.5"
          >
            {/* Canonical Graduation Prompt Quote (docs/02-learning-design.md §5.4) */}
            <blockquote className="rounded-[var(--tc-radius-sm)] border-l-2 border-[var(--tc-accent-cyan)] bg-[var(--tc-bg-base)] p-3.5 italic text-[var(--tc-text-primary)] font-mono text-xs leading-relaxed">
              &ldquo;You solved the logic. Now prove you can write production Python in Hacker Mode to earn the Command Crest (Hacker Mastery).&rdquo;
            </blockquote>

            <div className="space-y-2 text-xs text-[var(--tc-text-muted)]">
              <p>
                Your working logic will be automatically pre-populated into the Hacker Mode editor.
                Translate your model into production Python to claim <strong>Star 3 (Hacker Mastery)</strong> and enter the global leaderboards.
              </p>
              <div className="flex items-center gap-2 pt-1 font-mono text-[var(--tc-accent-cyan)] font-semibold">
                <span aria-hidden="true">★</span>
                <span>Reward: Command Crest &bull; Gold Star 3</span>
              </div>
            </div>
          </div>
        </DialogDescription>

        <DialogFooter className="mt-4 gap-2 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Stay in {completedMode === 'builder' ? 'Builder' : 'Explorer'}
          </Button>
          <Button variant="primary" size="sm" onClick={onGraduate}>
            Graduate to Hacker Mode →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
