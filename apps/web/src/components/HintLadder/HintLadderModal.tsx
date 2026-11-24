import * as React from 'react';
import type { PlayMode } from '@tensorcade/contracts';
import type { HintLadder } from '@tensorcade/levels';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@tensorcade/ui';
import { useProgressStore } from '../../storage/useProgressStore.js';
import { analytics } from '../../analytics/analytics.js';

export type HintTier = 0 | 1 | 2 | 3;

export interface HintLadderModalProps {
  readonly isOpen: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly levelId: string;
  readonly worldId: string;
  readonly hintLadder: HintLadder;
  readonly currentMode: PlayMode;
  readonly supportedModes?: ReadonlyArray<PlayMode> | undefined;
  readonly initialTierReached?: HintTier | undefined;
  readonly onSwitchToBuilder?: (() => void) | undefined;
  readonly onHintTierChange?: ((tier: HintTier) => void) | undefined;
}

export function HintLadderPanel({
  onClose,
  levelId,
  worldId,
  hintLadder,
  currentMode,
  supportedModes = ['explorer', 'builder', 'hacker'],
  initialTierReached = 0,
  onSwitchToBuilder,
  onHintTierChange,
}: Omit<HintLadderModalProps, 'isOpen' | 'onOpenChange'> & {
  readonly onClose: () => void;
}): React.JSX.Element {
  const storedTier = useProgressStore((state) => state.progress[levelId]?.hintTierReached ?? 0);
  const recordHintViewed = useProgressStore((state) => state.recordHintViewed);

  const [tierReached, setTierReached] = React.useState<HintTier>(() =>
    (Math.max(initialTierReached, storedTier) as HintTier),
  );
  const [confirmingTier3, setConfirmingTier3] = React.useState<boolean>(false);

  React.useEffect(() => {
    const effective = Math.max(initialTierReached, storedTier) as HintTier;
    setTierReached((prev) => (effective > prev ? effective : prev));
  }, [initialTierReached, storedTier]);

  const unlockTier = React.useCallback(
    async (tier: 1 | 2 | 3) => {
      const nextTier = Math.max(tierReached, tier) as HintTier;
      setTierReached(nextTier);
      setConfirmingTier3(false);
      onHintTierChange?.(nextTier);
      analytics.track('hint_viewed', { levelId, worldId, tier });
      await recordHintViewed(levelId, worldId, tier);
    },
    [levelId, worldId, tierReached, onHintTierChange, recordHintViewed],
  );

  const canOfferBuilder =
    tierReached >= 3 &&
    currentMode !== 'builder' &&
    supportedModes.includes('builder') &&
    onSwitchToBuilder !== undefined;

  return (
    <>
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-flex items-center rounded-[var(--tc-radius-sm)] border border-[var(--tc-border-subtle)] bg-[var(--tc-bg-base)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--tc-accent-cyan)]">
          HINT LADDER
        </span>
        <span className="font-mono text-xs text-[var(--tc-text-muted)]">
          Tier {tierReached} / 3
        </span>
      </div>

      <div className="space-y-3 py-2">
        {/* Tier 1: Free Nudge */}
        <section
          aria-label="Tier 1 Free Nudge"
          className="rounded-[var(--tc-radius-sm)] border border-[var(--tc-border-subtle)] bg-[var(--tc-bg-base)] p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-[var(--tc-accent-emerald)]">
                TIER 1: NUDGE
              </span>
              <span className="font-mono text-xs text-[var(--tc-text-muted)]">
                (0-star penalty)
              </span>
            </div>
            {tierReached < 1 && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void unlockTier(1)}
              >
                Reveal Tier 1
              </Button>
            )}
          </div>
          {tierReached >= 1 ? (
            <p className="mt-2 text-sm text-[var(--tc-text-primary)]">{hintLadder.tier1Nudge}</p>
          ) : (
            <p className="mt-2 text-xs text-[var(--tc-text-muted)]">
              Directional nudge without revealing the underlying concept or syntax.
            </p>
          )}
        </section>

        {/* Tier 2: Free Concept */}
        <section
          aria-label="Tier 2 Free Concept"
          className="rounded-[var(--tc-radius-sm)] border border-[var(--tc-border-subtle)] bg-[var(--tc-bg-base)] p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-[var(--tc-accent-cyan)]">
                TIER 2: CONCEPT
              </span>
              <span className="font-mono text-xs text-[var(--tc-text-muted)]">
                (0-star penalty)
              </span>
            </div>
            {tierReached >= 1 && tierReached < 2 && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void unlockTier(2)}
              >
                Reveal Tier 2
              </Button>
            )}
          </div>
          {tierReached >= 2 ? (
            <p className="mt-2 text-sm text-[var(--tc-text-primary)]">{hintLadder.tier2Concept}</p>
          ) : (
            <p className="mt-2 text-xs text-[var(--tc-text-muted)]">
              {tierReached < 1
                ? 'Unlock Tier 1 first to access the core algorithmic concept.'
                : 'Names the algorithmic principle behind this challenge.'}
            </p>
          )}
        </section>

        {/* Tier 3: Scaffold (1-star penalty confirmation) */}
        <section
          aria-label="Tier 3 Scaffold"
          className="rounded-[var(--tc-radius-sm)] border border-[var(--tc-border-subtle)] bg-[var(--tc-bg-base)] p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-[var(--tc-accent-amber)]">
                TIER 3: SCAFFOLD
              </span>
              <span className="font-mono text-xs text-[var(--tc-accent-amber)]">
                (1-star penalty)
              </span>
            </div>
            {tierReached >= 2 && tierReached < 3 && !confirmingTier3 && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setConfirmingTier3(true)}
              >
                Unlock Tier 3 (-1 Star)
              </Button>
            )}
          </div>

          {tierReached >= 3 ? (
            <div className="mt-2 space-y-2">
              <p className="text-sm text-[var(--tc-text-primary)]">{hintLadder.tier3Scaffold}</p>
              <p className="font-mono text-xs text-[var(--tc-text-muted)]">
                Scaffold guidance only — assemble the solution yourself to verify understanding.
              </p>
            </div>
          ) : confirmingTier3 ? (
            <div
              role="alert"
              className="mt-2 rounded-[var(--tc-radius-sm)] border border-[var(--tc-accent-amber)] bg-[var(--tc-bg-surface)] p-3 space-y-2"
            >
              <p className="text-xs text-[var(--tc-text-primary)]">
                Confirm 1-star penalty: revealing Tier 3 Scaffold forfeits Star 3 (no-hints mastery)
                on this level.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={() => void unlockTier(3)}
                >
                  Confirm 1-Star Penalty
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmingTier3(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs text-[var(--tc-text-muted)]">
              {tierReached < 2
                ? 'Unlock Tier 2 first to access structural scaffold guidance.'
                : 'Provides structural guidance without full copy-paste code.'}
            </p>
          )}
        </section>

        {/* Offer Builder mode if stuck after Tier 3 */}
        {canOfferBuilder && (
          <section
            aria-label="Builder Mode Fallback"
            className="rounded-[var(--tc-radius-sm)] border border-[var(--tc-accent-cyan)] bg-[var(--tc-bg-surface)] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="space-y-1">
              <p className="font-mono text-xs font-semibold text-[var(--tc-accent-cyan)]">
                STILL STUCK AFTER TIER 3?
              </p>
              <p className="text-xs text-[var(--tc-text-muted)]">
                Switch to Builder Mode to arrange verified Parsons code blocks step by step.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={() => {
                onSwitchToBuilder?.();
                onClose();
              }}
            >
              Switch to Builder Mode
            </Button>
          </section>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </>
  );
}

/**
 * Progressive 3-tier Hint Ladder modal (Radix Dialog).
 * - Tier 1: Free Nudge (0-star penalty)
 * - Tier 2: Free Concept (0-star penalty)
 * - Tier 3: Scaffold (requires 1-star penalty confirmation; never shows full copy-paste code)
 * - Offers Builder Mode if stuck after Tier 3.
 */
export function HintLadderModal({
  isOpen,
  onOpenChange,
  ...panelProps
}: HintLadderModalProps): React.JSX.Element {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="hint-ladder-description" className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Progressive Diagnostic Hints</DialogTitle>
          <DialogDescription id="hint-ladder-description">
            Unlock hints one step at a time. Tiers 1 and 2 are free; Tier 3 carries a 1-star
            mastery penalty.
          </DialogDescription>
        </DialogHeader>
        <HintLadderPanel {...panelProps} onClose={() => onOpenChange(false)} />
        <DialogFooter className="sr-only" />
      </DialogContent>
    </Dialog>
  );
}
