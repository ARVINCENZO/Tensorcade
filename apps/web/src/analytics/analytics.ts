import type { PlayMode } from '@tensorcade/contracts';
import { useSettingsStore } from '../storage/useSettingsStore.js';

export type AnalyticsEventName =
  'level_started' | 'level_completed' | 'hint_viewed' | 'mode_switched' | 'error_encountered';

export interface AnalyticsEventPayloads {
  level_started: {
    levelId: string;
    worldId: string;
    mode: PlayMode;
  };
  level_completed: {
    levelId: string;
    worldId: string;
    mode: PlayMode;
    starsEarned: 0 | 1 | 2 | 3;
    score: number;
    ticks?: number | undefined;
  };
  hint_viewed: {
    levelId: string;
    worldId: string;
    tier: 0 | 1 | 2 | 3;
  };
  mode_switched: {
    fromMode: PlayMode;
    toMode: PlayMode;
    levelId?: string | undefined;
  };
  error_encountered: {
    code: string;
    message: string;
    context?: string | undefined;
  };
}

export interface PostHogCapturePayload<T extends AnalyticsEventName = AnalyticsEventName> {
  api_key: string;
  event: T;
  properties: AnalyticsEventPayloads[T] & {
    distinct_id: string;
    $lib: 'tensorcade-web';
  };
  timestamp: string;
}

export type AnalyticsTransport = (
  endpoint: string,
  payload: PostHogCapturePayload,
) => Promise<void> | void;

export interface AnalyticsTrackerConfig {
  apiKey?: string | undefined;
  host?: string | undefined;
  distinctId?: string | undefined;
  getConsent?: (() => boolean | null) | undefined;
  transport?: AnalyticsTransport | undefined;
}

const DEFAULT_POSTHOG_HOST = 'https://app.posthog.com';

async function defaultFetchTransport(
  endpoint: string,
  payload: PostHogCapturePayload,
): Promise<void> {
  if (typeof fetch !== 'function') {
    return;
  }
  await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  });
}

export interface AnalyticsTracker {
  track: <T extends AnalyticsEventName>(event: T, properties: AnalyticsEventPayloads[T]) => boolean;
}

/**
 * Creates a consent-gated, PostHog-compatible analytics tracker.
 * Guarantees zero network calls whenever consentAnalytics !== true.
 */
export function createAnalyticsTracker(config: AnalyticsTrackerConfig = {}): AnalyticsTracker {
  const host = (config.host ?? DEFAULT_POSTHOG_HOST).replace(/\/+$/, '');
  const endpoint = `${host}/capture/`;
  const apiKey = config.apiKey ?? '';
  const distinctId = config.distinctId ?? 'guest';
  const getConsent = config.getConsent ?? (() => useSettingsStore.getState().consentAnalytics);
  const transport = config.transport ?? defaultFetchTransport;

  return {
    track<T extends AnalyticsEventName>(event: T, properties: AnalyticsEventPayloads[T]): boolean {
      if (getConsent() !== true) {
        return false;
      }

      const payload: PostHogCapturePayload<T> = {
        api_key: apiKey,
        event,
        properties: {
          ...properties,
          distinct_id: distinctId,
          $lib: 'tensorcade-web',
        },
        timestamp: new Date().toISOString(),
      };

      void Promise.resolve(transport(endpoint, payload)).catch(() => {
        // Telemetry failures must never disrupt learner gameplay
      });

      return true;
    },
  };
}

export const analytics: AnalyticsTracker = createAnalyticsTracker();
