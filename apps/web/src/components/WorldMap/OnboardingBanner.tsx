import * as React from 'react';
import { Button } from '@tensorcade/ui';
import { useProgressStore } from '../../storage/useProgressStore.js';
import { useSafeLevelNavigate } from './useSafeLevelNavigate.js';

export const FIRST_LEVEL_ID = 'w1-robot-farm-1.1';

export interface OnboardingBannerProps {
  completedCount?: number | undefined;
  onStartFirstLevel?: (() => void) | undefined;
}

/**
 * Adult-toned hero card displayed when the learner has completed zero levels.
 * Guides the user directly into Level 1.1: First Furrow.
 */
export function OnboardingBanner({
  completedCount,
  onStartFirstLevel,
}: OnboardingBannerProps): React.JSX.Element | null {
  const progress = useProgressStore((state) => state.progress);
  const navigateToLevel = useSafeLevelNavigate();

  const effectiveCompletedCount =
    completedCount !== undefined
      ? completedCount
      : Object.values(progress).filter(
          (record) => record.starsEarned > 0 || record.clearedModes.length > 0,
        ).length;

  if (effectiveCompletedCount > 0) {
    return null;
  }

  const handleStart = (): void => {
    if (onStartFirstLevel) {
      onStartFirstLevel();
      return;
    }
    navigateToLevel(FIRST_LEVEL_ID);
  };

  return (
    <section
      aria-label="Onboarding Briefing"
      className="rounded-[var(--tc-radius-md)] border border-[var(--tc-accent-cyan)] bg-[var(--tc-bg-surface)] p-6 shadow-sm"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--tc-accent-cyan)]" />
            <span className="font-mono text-xs uppercase tracking-wider text-[var(--tc-accent-cyan)]">
              Initialization Briefing
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--tc-text-primary)]">
            Begin Deterministic Simulation Training
          </h2>
          <p className="text-sm text-[var(--tc-text-muted)] leading-relaxed">
            Write executable Python control loops, inspect live state transitions, and verify
            solutions across Sensor, Assembly, and Command tiers. Complete Level 1.1 to unlock
            subsequent nodes in the curriculum grid.
          </p>
        </div>

        <div className="shrink-0">
          <Button type="button" variant="primary" size="md" onClick={handleStart}>
            Start Level 1.1: First Furrow -&gt;
          </Button>
        </div>
      </div>
    </section>
  );
}
