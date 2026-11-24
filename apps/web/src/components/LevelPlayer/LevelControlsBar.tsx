import * as React from 'react';
import { Button } from '@tensorcade/ui';
import type { HintTier } from '../HintLadder/HintLadderModal.js';

export type PlaybackSpeed = 0.5 | 1 | 2 | 4;

const SPEED_OPTIONS: readonly PlaybackSpeed[] = [0.5, 1, 2, 4];

export interface LevelControlsBarProps {
  readonly levelTitle: string;
  readonly isRunning: boolean;
  readonly speed: PlaybackSpeed;
  readonly isLessonOpen: boolean;
  readonly hintTierReached: HintTier;
  readonly onBackToMap: () => void;
  readonly onRun: () => void;
  readonly onStep: () => void;
  readonly onReset: () => void;
  readonly onSpeedChange: (speed: PlaybackSpeed) => void;
  readonly onOpenHints: () => void;
  readonly onToggleLesson: () => void;
}

/**
 * Top control toolbar for LevelPlayer providing navigation, execution,
 * stepping, instant reset, speed selection, hints, and lesson drawer toggle.
 */
export function LevelControlsBar({
  levelTitle,
  isRunning,
  speed,
  isLessonOpen,
  hintTierReached,
  onBackToMap,
  onRun,
  onStep,
  onReset,
  onSpeedChange,
  onOpenHints,
  onToggleLesson,
}: LevelControlsBarProps): React.JSX.Element {
  return (
    <div
      role="toolbar"
      aria-label={`Level controls for ${levelTitle}`}
      className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--tc-border-subtle)] bg-[var(--tc-bg-surface)] px-4 py-2.5"
    >
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBackToMap}
          aria-label="Back to World Map"
        >
          ← World Map
        </Button>
        <div className="h-4 w-px bg-[var(--tc-border-subtle)]" aria-hidden="true" />
        <h1 className="font-mono text-sm font-bold text-[var(--tc-text-primary)]">{levelTitle}</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={isRunning}
          onClick={onRun}
          title="Run and submit across all 5 seeds (Ctrl+Enter)"
        >
          {isRunning ? 'Running…' : 'Run / Submit'}
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onStep}
          title="Step forward one tick (Space)"
        >
          Step
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onReset}
          title="Instant Reset to tick 0 (Ctrl+R)"
        >
          Reset
        </Button>

        <div
          role="group"
          aria-label="Playback Speed"
          className="flex items-center rounded-[var(--tc-radius-sm)] border border-[var(--tc-border-subtle)] bg-[var(--tc-bg-base)] p-0.5"
        >
          {SPEED_OPTIONS.map((option) => {
            const active = speed === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => onSpeedChange(option)}
                className={`px-2 py-1 font-mono text-xs rounded-[var(--tc-radius-sm)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--tc-accent-cyan)] focus-visible:outline-offset-[var(--tc-focus-outline-offset)] ${
                  active
                    ? 'bg-[var(--tc-accent-cyan)] text-[var(--tc-bg-base)] font-bold'
                    : 'text-[var(--tc-text-muted)] hover:text-[var(--tc-text-primary)]'
                }`}
              >
                {option}x
              </button>
            );
          })}
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onOpenHints}
          aria-label="Open Hint Ladder"
        >
          Hints {hintTierReached > 0 ? `(${hintTierReached}/3)` : ''}
        </Button>

        <Button
          type="button"
          variant={isLessonOpen ? 'secondary' : 'ghost'}
          size="sm"
          aria-pressed={isLessonOpen}
          onClick={onToggleLesson}
        >
          Lesson
        </Button>
      </div>
    </div>
  );
}
