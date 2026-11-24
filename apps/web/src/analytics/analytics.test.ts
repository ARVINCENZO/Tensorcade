import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAnalyticsTracker, type PostHogCapturePayload } from './analytics.js';
import { ConsentBanner } from './ConsentBanner.js';
import { useSettingsStore } from '../storage/useSettingsStore.js';

afterEach(() => {
  useSettingsStore.setState({ consentAnalytics: null });
  vi.restoreAllMocks();
});

describe('apps/web/src/analytics - Consent-Gated Analytics', () => {
  it('makes zero network calls when consentAnalytics is null or false', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const transportSpy = vi.fn();
    let currentConsent: boolean | null = null;
    const tracker = createAnalyticsTracker({
      apiKey: 'phc_test_key',
      getConsent: () => currentConsent,
      transport: transportSpy,
    });

    expect(
      tracker.track('level_started', { levelId: 'w1-l1', worldId: 'world-1', mode: 'explorer' }),
    ).toBe(false);
    expect(
      tracker.track('hint_viewed', { levelId: 'w1-l1', worldId: 'world-1', tier: 1 }),
    ).toBe(false);

    currentConsent = false;
    expect(
      tracker.track('level_completed', {
        levelId: 'w1-l1',
        worldId: 'world-1',
        mode: 'hacker',
        starsEarned: 3,
        score: 1000,
        ticks: 24,
      }),
    ).toBe(false);
    expect(
      tracker.track('mode_switched', { fromMode: 'explorer', toMode: 'builder' }),
    ).toBe(false);
    expect(
      tracker.track('error_encountered', { code: 'E_SYNTAX', message: 'SyntaxError' }),
    ).toBe(false);

    expect(transportSpy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends PostHog-compatible events only when consentAnalytics is true', async () => {
    const captured: Array<{ endpoint: string; payload: PostHogCapturePayload }> = [];
    const tracker = createAnalyticsTracker({
      apiKey: 'phc_live_key',
      host: 'https://analytics.tensorcade.test/',
      distinctId: 'learner-42',
      getConsent: () => true,
      transport: (endpoint, payload) => {
        captured.push({ endpoint, payload });
      },
    });

    const sent = tracker.track('level_completed', {
      levelId: 'w1-l1',
      worldId: 'world-1',
      mode: 'builder',
      starsEarned: 3,
      score: 980,
      ticks: 15,
    });

    expect(sent).toBe(true);
    expect(captured).toHaveLength(1);
    const first = captured[0];
    expect(first?.endpoint).toBe('https://analytics.tensorcade.test/capture/');
    expect(first?.payload.api_key).toBe('phc_live_key');
    expect(first?.payload.event).toBe('level_completed');
    expect(first?.payload.properties.distinct_id).toBe('learner-42');
    if (first && 'starsEarned' in first.payload.properties) {
      expect(first.payload.properties.starsEarned).toBe(3);
    }
  });

  it('respects Zustand useSettingsStore.consentAnalytics by default', () => {
    const transportSpy = vi.fn();
    const tracker = createAnalyticsTracker({ transport: transportSpy });

    useSettingsStore.setState({ consentAnalytics: false });
    expect(
      tracker.track('level_started', { levelId: 'w1-l1', worldId: 'world-1', mode: 'explorer' }),
    ).toBe(false);
    expect(transportSpy).not.toHaveBeenCalled();

    useSettingsStore.setState({ consentAnalytics: true });
    expect(
      tracker.track('level_started', { levelId: 'w1-l1', worldId: 'world-1', mode: 'explorer' }),
    ).toBe(true);
    expect(transportSpy).toHaveBeenCalledTimes(1);
  });

  it('renders ConsentBanner only when consentAnalytics is null', () => {
    const markupWhenNull = renderToStaticMarkup(
      React.createElement(ConsentBanner, { consent: null }),
    );
    expect(markupWhenNull).toContain('Analytics consent');
    expect(markupWhenNull).toContain('Accept');
    expect(markupWhenNull).toContain('Decline');

    const markupWhenFalse = renderToStaticMarkup(
      React.createElement(ConsentBanner, { consent: false }),
    );
    expect(markupWhenFalse).toBe('');

    const markupWhenTrue = renderToStaticMarkup(
      React.createElement(ConsentBanner, { consent: true }),
    );
    expect(markupWhenTrue).toBe('');
  });
});
