import * as React from 'react';
import type { PlayMode } from '@tensorcade/contracts';
import type { ScoringRubric } from '@tensorcade/levels';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@tensorcade/ui';

export interface LevelResultSummary {
  readonly passed: boolean;
  readonly starsEarned: 0 | 1 | 2 | 3;
  readonly star1Earned: boolean;
  readonly star2Earned: boolean;
  readonly star3Earned: boolean;
  readonly ticks: number;
  readonly energyRemaining: number;
  readonly mode: PlayMode;
  readonly seedsPassed: number;
  readonly totalSeeds: number;
  readonly message?: string | undefined;
}

export interface ResultModalProps {
  readonly isOpen: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly levelTitle: string;
  readonly scoringRubric: ScoringRubric;
  readonly result: LevelResultSummary | null;
  readonly supportedModes?: ReadonlyArray<PlayMode> | undefined;
  readonly nextLevelId?: string | undefined;
  readonly onGraduateToHacker?: (() => void) | undefined;
  readonly onNextLevel?: ((nextLevelId: string) => void) | undefined;
  readonly onRetry?: (() => void) | undefined;
}

function getTerminalCrest(mode: PlayMode): { label: string; title: string } {
  switch (mode) {
    case 'explorer':
      return { label: 'Sensor Crest', title: 'Explorer Mode Mastery' };
    case 'builder':
      return { label: 'Assembly Crest', title: 'Builder Mode Mastery' };
    case 'hacker':
      return { label: 'Command Crest', title: 'Hacker Mastery' };
  }
}

/**
 * Level completion / failure modal (Radix Dialog) showing 3-star breakdown,
 * telemetry (ticks, energy), Terminal Crest, PRD Graduation Prompt when cleared
 * in explorer/builder, and Next Level navigation.
 */
export function ResultModalPanel({
  onClose,
  levelTitle,
  scoringRubric,
  result,
  supportedModes = ['explorer', 'builder', 'hacker'],
  nextLevelId,
  onGraduateToHacker,
  onNextLevel,
  onRetry,
}: Omit<ResultModalProps, 'isOpen' | 'onOpenChange'> & {
  readonly onClose: () => void;
}): React.JSX.Element {
  if (!result) {
    return (
      <p className="text-sm text-[var(--tc-text-muted)]">
        Run your solution to evaluate telemetry and star mastery.
      </p>
    );
  }

  const crest = getTerminalCrest(result.mode);
  const showGraduationPrompt =
    result.passed &&
    (result.mode === 'explorer' || result.mode === 'builder') &&
    supportedModes.includes('hacker') &&
    onGraduateToHacker !== undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center rounded-[var(--tc-radius-sm)] px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-wide ${
            result.passed
              ? 'bg-[var(--tc-accent-emerald)] text-[var(--tc-bg-base)]'
              : 'bg-[var(--tc-accent-crimson)] text-[var(--tc-bg-base)]'
          }`}
        >
          {result.passed ? 'SIMULATION PASSED' : 'SIMULATION FAILED'}
        </span>
        {result.passed && (
          <span
            aria-label={`Terminal Crest: ${crest.label}`}
            className="inline-flex items-center rounded-[var(--tc-radius-sm)] border border-[var(--tc-accent-cyan)] bg-[var(--tc-bg-base)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--tc-accent-cyan)]"
          >
            {crest.label}
          </span>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-[var(--tc-text-primary)]">
          {levelTitle} — {result.starsEarned} / 3 Stars
        </h2>
        <p className="text-sm text-[var(--tc-text-muted)]">
          {result.message ??
            (result.passed
              ? `Verified deterministically across ${result.seedsPassed}/${result.totalSeeds} seeds.`
              : `Passed ${result.seedsPassed}/${result.totalSeeds} seeds. Inspect telemetry and retry.`)}
        </p>
      </div>

      {/* 3-Star Rubric Breakdown */}
      <section aria-label="3-Star Mastery Breakdown" className="space-y-2">
        <div className="flex items-center justify-between rounded-[var(--tc-radius-sm)] border border-[var(--tc-border-subtle)] bg-[var(--tc-bg-base)] px-3 py-2">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={
                result.star1Earned
                  ? 'text-[var(--tc-accent-amber)]'
                  : 'text-[var(--tc-text-dim)]'
              }
            >
              {result.star1Earned ? '★' : '☆'}
            </span>
            <div>
              <p className="font-mono text-xs font-semibold text-[var(--tc-text-primary)]">
                Star 1: Correctness
              </p>
              <p className="text-xs text-[var(--tc-text-muted)]">
                {scoringRubric.star1.description}
              </p>
            </div>
          </div>
          <span className="font-mono text-xs text-[var(--tc-text-muted)]">
            {result.star1Earned ? 'EARNED' : 'MISSED'}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-[var(--tc-radius-sm)] border border-[var(--tc-border-subtle)] bg-[var(--tc-bg-base)] px-3 py-2">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={
                result.star2Earned
                  ? 'text-[var(--tc-accent-amber)]'
                  : 'text-[var(--tc-text-dim)]'
              }
            >
              {result.star2Earned ? '★' : '☆'}
            </span>
            <div>
              <p className="font-mono text-xs font-semibold text-[var(--tc-text-primary)]">
                Star 2: Efficiency ({result.ticks} &le; {scoringRubric.star2.threshold}{' '}
                {scoringRubric.star2.metric})
              </p>
              <p className="text-xs text-[var(--tc-text-muted)]">
                {scoringRubric.star2.description}
              </p>
            </div>
          </div>
          <span className="font-mono text-xs text-[var(--tc-text-muted)]">
            {result.star2Earned ? 'EARNED' : 'MISSED'}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-[var(--tc-radius-sm)] border border-[var(--tc-border-subtle)] bg-[var(--tc-bg-base)] px-3 py-2">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={
                result.star3Earned
                  ? 'text-[var(--tc-accent-amber)]'
                  : 'text-[var(--tc-text-dim)]'
              }
            >
              {result.star3Earned ? '★' : '☆'}
            </span>
            <div>
              <p className="font-mono text-xs font-semibold text-[var(--tc-text-primary)]">
                Star 3: Master Terminal (Hacker + 0 Hints)
              </p>
              <p className="text-xs text-[var(--tc-text-muted)]">
                {scoringRubric.star3.description}
              </p>
            </div>
          </div>
          <span className="font-mono text-xs text-[var(--tc-text-muted)]">
            {result.star3Earned ? 'EARNED' : 'LOCKED'}
          </span>
        </div>
      </section>

      {/* Telemetry */}
      <section
        aria-label="Simulation Telemetry"
        className="grid grid-cols-3 gap-2 rounded-[var(--tc-radius-sm)] border border-[var(--tc-border-subtle)] bg-[var(--tc-bg-base)] p-3 font-mono text-xs"
      >
        <div>
          <span className="block text-[var(--tc-text-muted)]">TICKS</span>
          <span className="text-sm font-bold text-[var(--tc-accent-amber)]">{result.ticks}</span>
        </div>
        <div>
          <span className="block text-[var(--tc-text-muted)]">ENERGY</span>
          <span className="text-sm font-bold text-[var(--tc-accent-emerald)]">
            {result.energyRemaining}%
          </span>
        </div>
        <div>
          <span className="block text-[var(--tc-text-muted)]">SEEDS</span>
          <span className="text-sm font-bold text-[var(--tc-accent-cyan)]">
            {result.seedsPassed}/{result.totalSeeds}
          </span>
        </div>
      </section>

      {/* PRD Graduation Prompt when cleared in explorer/builder */}
      {showGraduationPrompt && (
        <section
          aria-label="Hacker Mode Graduation Prompt"
          className="rounded-[var(--tc-radius-sm)] border border-[var(--tc-accent-cyan)] bg-[var(--tc-bg-base)] p-3.5 space-y-3"
        >
          <p className="text-xs leading-relaxed text-[var(--tc-text-primary)]">
            You solved the logic. Now prove you can write production Python in Hacker Mode to earn
            the Command Crest (Hacker Mastery).
          </p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              onGraduateToHacker?.();
              onClose();
            }}
          >
            [Graduate to Hacker Mode -&gt;]
          </Button>
        </section>
      )}

      <div className="flex flex-wrap justify-end gap-2 pt-1">
        {onRetry && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onRetry();
              onClose();
            }}
          >
            Retry
          </Button>
        )}
        {result.passed && nextLevelId && onNextLevel && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              onNextLevel(nextLevelId);
              onClose();
            }}
          >
            [Next Level -&gt;]
          </Button>
        )}
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

/**
 * Level completion / failure modal (Radix Dialog) showing 3-star breakdown,
 * telemetry (ticks, energy), Terminal Crest, PRD Graduation Prompt when cleared
 * in explorer/builder, and Next Level navigation.
 */
export function ResultModal({
  isOpen,
  onOpenChange,
  ...panelProps
}: ResultModalProps): React.JSX.Element {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="result-modal-description" className="max-w-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{panelProps.levelTitle}</DialogTitle>
          <DialogDescription id="result-modal-description">
            Simulation result summary and 3-star mastery breakdown.
          </DialogDescription>
        </DialogHeader>
        <ResultModalPanel {...panelProps} onClose={() => onOpenChange(false)} />
        <DialogFooter className="sr-only" />
      </DialogContent>
    </Dialog>
  );
}
