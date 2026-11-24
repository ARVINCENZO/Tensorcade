import * as React from 'react';
import { Button } from '@tensorcade/ui';
import { ConsentBanner } from '../../analytics/ConsentBanner.js';
import type { ThemeMode } from '../../storage/db.js';
import { useProgressStore } from '../../storage/useProgressStore.js';
import { useSettingsStore } from '../../storage/useSettingsStore.js';
import { SettingsModal } from '../SettingsModal/SettingsModal.js';

export interface AppShellProps {
  children: React.ReactNode;
  theme?: ThemeMode | undefined;
  reducedMotion?: boolean | undefined;
}

export function AppShell({
  children,
  theme: themeProp,
  reducedMotion: reducedMotionProp,
}: AppShellProps): React.JSX.Element {
  const storeTheme = useSettingsStore((state) => state.theme);
  const storeReducedMotion = useSettingsStore((state) => state.reducedMotion);
  const theme = themeProp ?? storeTheme;
  const reducedMotion = reducedMotionProp ?? storeReducedMotion;
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const loadProgress = useProgressStore((state) => state.loadProgress);

  React.useEffect(() => {
    void loadProgress();
    void loadSettings();
  }, [loadProgress, loadSettings]);

  return (
    <div
      data-theme={theme}
      data-reduced-motion={String(reducedMotion)}
      className="min-h-screen flex flex-col bg-[var(--tc-bg-base)] text-[var(--tc-text-primary)] font-sans"
    >
      {/* Skip to main content link for keyboard & screen reader accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[var(--tc-z-modal)] focus:px-4 focus:py-2 focus:bg-[var(--tc-accent-cyan)] focus:text-[var(--tc-bg-base)] focus:font-semibold focus:rounded-[var(--tc-radius-sm)] focus:outline focus:outline-2 focus:outline-[var(--tc-text-primary)] focus:outline-offset-[var(--tc-focus-outline-offset)]"
      >
        Skip to main content
      </a>

      {/* Main Global Navigation */}
      <header className="border-b border-[var(--tc-border-subtle)] bg-[var(--tc-bg-surface)] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a
              href="/"
              className="flex items-center gap-2.5 font-mono text-base font-bold tracking-tight text-[var(--tc-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--tc-accent-cyan)] focus-visible:outline-offset-[var(--tc-focus-outline-offset)]"
            >
              <div className="h-6 w-6 rounded-[var(--tc-radius-sm)] bg-[var(--tc-accent-cyan)] flex items-center justify-center text-[var(--tc-bg-base)] font-mono text-xs font-bold">
                TC
              </div>
              <span>TENSORCADE</span>
            </a>

            <nav
              aria-label="Primary Navigation"
              className="hidden sm:flex items-center gap-4 text-xs font-mono"
            >
              <a
                href="/"
                className="text-[var(--tc-accent-cyan)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--tc-accent-cyan)] focus-visible:outline-offset-[var(--tc-focus-outline-offset)]"
              >
                Curriculum Map
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-[var(--tc-radius-sm)] border border-[var(--tc-border-subtle)] font-mono text-xs text-[var(--tc-text-muted)]">
              <span className="h-2 w-2 rounded-full bg-[var(--tc-accent-emerald)]" />
              <span>GUEST TERMINAL</span>
            </div>
            <SettingsModal
              trigger={
                <Button type="button" variant="secondary" size="sm" aria-label="Open settings">
                  Settings
                </Button>
              }
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.assign('/');
                }
              }}
            >
              Reset Session
            </Button>
          </div>
        </div>
      </header>

      {/* Main Landmark */}
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>

      {/* Accessible Footer Landmark */}
      <footer className="border-t border-[var(--tc-border-subtle)] bg-[var(--tc-bg-surface)] py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-[var(--tc-text-muted)]">
          <div className="flex items-center gap-2">
            <span>TENSORCADE v0.1.0</span>
            <span>&bull;</span>
            <span>DETERMINISTIC SIMULATION ENGINE</span>
          </div>
          <div>
            <span>WCAG 2.2 AA ACCESSIBLE &bull; COOP/COEP ISOLATED</span>
          </div>
        </div>
      </footer>

      <ConsentBanner />
    </div>
  );
}
