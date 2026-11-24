import { describe, it, expect, beforeEach } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LEVEL_1_1_MANIFEST } from '@tensorcade/levels';
import { HintLadderPanel } from './HintLadderModal.js';
import { useProgressStore } from '../../storage/useProgressStore.js';
import { createAnalyticsTracker } from '../../analytics/analytics.js';

describe('HintLadderModal', () => {
  beforeEach(() => {
    useProgressStore.getState().resetProgressState();
  });

  it('starts at Tier 0 without revealing hints or reference solution', () => {
    const html = renderToStaticMarkup(
      <HintLadderPanel
        onClose={() => {}}
        levelId={LEVEL_1_1_MANIFEST.id}
        worldId={LEVEL_1_1_MANIFEST.worldId}
        hintLadder={LEVEL_1_1_MANIFEST.hintLadder}
        currentMode="hacker"
        initialTierReached={0}
      />,
    );

    expect(html).toContain('Tier 0 / 3');
    expect(html).toContain('TIER 1: NUDGE');
    expect(html).toContain('0-star penalty');
    expect(html).toContain('Reveal Tier 1');
    expect(html).not.toContain(LEVEL_1_1_MANIFEST.hintLadder.tier1Nudge);
    expect(html).not.toContain(LEVEL_1_1_MANIFEST.referenceSolution.trim());
  });

  it('renders Tier 1 Free Nudge and unlocks Tier 2 button', () => {
    const html = renderToStaticMarkup(
      <HintLadderPanel
        onClose={() => {}}
        levelId={LEVEL_1_1_MANIFEST.id}
        worldId={LEVEL_1_1_MANIFEST.worldId}
        hintLadder={LEVEL_1_1_MANIFEST.hintLadder}
        currentMode="hacker"
        initialTierReached={1}
      />,
    );

    expect(html).toContain('Tier 1 / 3');
    expect(html).toContain(LEVEL_1_1_MANIFEST.hintLadder.tier1Nudge);
    expect(html).toContain('Reveal Tier 2');
    expect(html).not.toContain(LEVEL_1_1_MANIFEST.hintLadder.tier2Concept);
  });

  it('renders Tier 2 Free Concept and prompts 1-star penalty unlock for Tier 3', () => {
    const html = renderToStaticMarkup(
      <HintLadderPanel
        onClose={() => {}}
        levelId={LEVEL_1_1_MANIFEST.id}
        worldId={LEVEL_1_1_MANIFEST.worldId}
        hintLadder={LEVEL_1_1_MANIFEST.hintLadder}
        currentMode="hacker"
        initialTierReached={2}
      />,
    );

    expect(html).toContain('Tier 2 / 3');
    expect(html).toContain(LEVEL_1_1_MANIFEST.hintLadder.tier2Concept);
    expect(html).toContain('Unlock Tier 3 (-1 Star)');
    expect(html).toContain('1-star penalty');
  });

  it('renders Tier 3 Scaffold without full copy-paste code and offers Builder mode', () => {
    const html = renderToStaticMarkup(
      <HintLadderPanel
        onClose={() => {}}
        levelId={LEVEL_1_1_MANIFEST.id}
        worldId={LEVEL_1_1_MANIFEST.worldId}
        hintLadder={LEVEL_1_1_MANIFEST.hintLadder}
        currentMode="hacker"
        supportedModes={['explorer', 'builder', 'hacker']}
        initialTierReached={3}
        onSwitchToBuilder={() => {}}
      />,
    );

    expect(html).toContain('Tier 3 / 3');
    expect(html).toContain(LEVEL_1_1_MANIFEST.hintLadder.tier3Scaffold);
    expect(html).toContain('Switch to Builder Mode');
    expect(html).not.toContain(LEVEL_1_1_MANIFEST.referenceSolution.trim());
  });

  it('records viewed hint tier in useProgressStore and tracks hint_viewed analytics', async () => {
    const events: string[] = [];
    const tracker = createAnalyticsTracker({
      getConsent: () => true,
      transport: (_endpoint, payload) => {
        if ('tier' in payload.properties) {
          events.push(`${payload.event}:${String(payload.properties.tier)}`);
        }
      },
    });

    await useProgressStore
      .getState()
      .recordHintViewed(LEVEL_1_1_MANIFEST.id, LEVEL_1_1_MANIFEST.worldId, 2);
    tracker.track('hint_viewed', {
      levelId: LEVEL_1_1_MANIFEST.id,
      worldId: LEVEL_1_1_MANIFEST.worldId,
      tier: 2,
    });

    expect(useProgressStore.getState().progress[LEVEL_1_1_MANIFEST.id]?.hintTierReached).toBe(2);
    expect(events).toEqual(['hint_viewed:2']);
  });
});
