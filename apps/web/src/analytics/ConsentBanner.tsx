import * as React from 'react';
import { Button } from '@tensorcade/ui';
import { useSettingsStore } from '../storage/useSettingsStore.js';

export interface ConsentBannerProps {
  consent?: boolean | null | undefined;
  onConsentChange?: ((accepted: boolean) => void) | undefined;
}

/**
 * Privacy-first analytics consent banner.
 * Visible only while consentAnalytics is null (undecided).
 */
export function ConsentBanner({
  consent,
  onConsentChange,
}: ConsentBannerProps): React.JSX.Element | null {
  const storeConsent = useSettingsStore((state) => state.consentAnalytics);
  const setConsentAnalytics = useSettingsStore((state) => state.setConsentAnalytics);
  const effectiveConsent = consent !== undefined ? consent : storeConsent;

  if (effectiveConsent !== null) {
    return null;
  }

  const handleDecision = (accepted: boolean): void => {
    void setConsentAnalytics(accepted);
    onConsentChange?.(accepted);
  };

  return (
    <aside
      role="region"
      aria-label="Analytics consent"
      className="fixed bottom-4 right-4 z-[var(--tc-z-toast)] max-w-md rounded-[var(--tc-radius-md)] border border-[var(--tc-border-subtle)] bg-[var(--tc-bg-surface)] p-4 text-[var(--tc-text-primary)] shadow-lg"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-mono text-sm font-semibold text-[var(--tc-text-primary)]">
            Privacy &amp; Telemetry
          </h2>
          <p className="text-xs text-[var(--tc-text-muted)]">
            Tensorcade runs locally in your browser. Allow anonymous usage analytics to help improve
            level pacing? No code or personal data is ever collected.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => handleDecision(false)}
          >
            Decline
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => handleDecision(true)}
          >
            Accept
          </Button>
        </div>
      </div>
    </aside>
  );
}
