import { describe, it, expect, vi, afterEach } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { coopCoepHeaders } from './headers.js';
import { validateEnv } from './env.js';
import { DEFAULT_WORLD_CATALOG } from './data/defaultCatalog.js';
import { WorldCatalogSchema, WorldCatalog } from '@tensorcade/contracts';
import { ErrorBoundary, ErrorFallback } from './components/ErrorBoundary/ErrorBoundary.js';
import { WorldMapLayout } from './components/WorldMap/WorldMapLayout.js';
import { OnboardingBanner } from './components/WorldMap/OnboardingBanner.js';
import { AppShell } from './components/Layout/AppShell.js';
import { router, routeTree } from './router.js';
import { useProgressStore } from './storage/useProgressStore.js';
import { useSettingsStore } from './storage/useSettingsStore.js';

describe('apps/web - Web Application Shell Specifications', () => {
  describe('COOP/COEP Isolation Headers (Vite Dev & Preview)', () => {
    it('defines strict Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy headers', () => {
      expect(coopCoepHeaders['Cross-Origin-Opener-Policy']).toBe('same-origin');
      expect(coopCoepHeaders['Cross-Origin-Embedder-Policy']).toBe('require-corp');
    });
  });

  describe('Zod Environment Variable Validation (env.ts)', () => {
    it('validates default environment variables against schema', () => {
      const parsed = validateEnv({
        MODE: 'development',
        DEV: true,
        PROD: false,
        BASE_URL: '/',
        VITE_API_URL: 'http://localhost:3000',
        VITE_APP_TITLE: 'Tensorcade',
      });

      expect(parsed.MODE).toBe('development');
      expect(parsed.DEV).toBe(true);
      expect(parsed.PROD).toBe(false);
      expect(parsed.VITE_API_URL).toBe('http://localhost:3000');
      expect(parsed.VITE_APP_TITLE).toBe('Tensorcade');
    });

    it('supplies defaults when optional env variables are omitted', () => {
      const parsed = validateEnv({});
      expect(parsed.MODE).toBe('development');
      expect(parsed.VITE_API_URL).toBe('http://localhost:3000');
      expect(parsed.VITE_APP_TITLE).toBe('Tensorcade');
    });

    it('rejects invalid URLs with descriptive validation error', () => {
      expect(() =>
        validateEnv({
          VITE_API_URL: 'not-a-valid-url',
        }),
      ).toThrowError(/Environment variable validation failed/);
    });

    it('rejects invalid MODE enumeration values', () => {
      expect(() =>
        validateEnv({
          MODE: 'staging',
        }),
      ).toThrowError(/Environment variable validation failed/);
    });
  });

  describe('Global Error Boundary & Fallback UI', () => {
    it('renders children when no error occurs in ErrorBoundary', () => {
      const html = renderToStaticMarkup(
        <ErrorBoundary>
          <div data-testid="child-content">Operational Grid Online</div>
        </ErrorBoundary>,
      );
      expect(html).toContain('Operational Grid Online');
      expect(html).not.toContain('Application Error Encountered');
    });

    it('renders accessible alert role and adult-toned messaging in ErrorFallback', () => {
      const testError = new Error('Test matrix decomposition failure');
      const html = renderToStaticMarkup(
        <ErrorFallback error={testError} resetErrorBoundary={vi.fn()} />,
      );

      expect(html).toContain('role="alert"');
      expect(html).toContain('aria-live="assertive"');
      expect(html).toContain('Application Error Encountered');
      expect(html).toContain('Test matrix decomposition failure');
      expect(html).toContain('Return to World Map');
      expect(html).toContain('Reload Application');
    });
  });

  describe('Accessible World Map Layout (@tensorcade/ui & @tensorcade/contracts)', () => {
    it('DEFAULT_WORLD_CATALOG strictly conforms to WorldCatalogSchema', () => {
      const parsed = WorldCatalogSchema.safeParse(DEFAULT_WORLD_CATALOG);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.worlds.length).toBe(5);
        expect(parsed.data.worlds[0]?.id).toBe('world-1');
        expect(parsed.data.worlds[0]?.games[0]?.id).toBe('robot-farm');
      }
    });

    it('renders accessible world map navigation landmarks, headings, and telemetry', () => {
      const html = renderToStaticMarkup(<WorldMapLayout catalog={DEFAULT_WORLD_CATALOG} />);

      expect(html).toContain('Curriculum World Map');
      expect(html).toContain('Curriculum Worlds Navigation');
      expect(html).toContain('SECTORS:');
      expect(html).toContain('GAMES:');
      expect(html).toContain('LEVELS:');
      expect(html).toContain('Robot Farm');
      expect(html).toContain('Launch Game');
    });

    it('renders accessible status message when catalog has zero worlds', () => {
      const emptyCatalog: WorldCatalog = { worlds: [] };
      const html = renderToStaticMarkup(<WorldMapLayout catalog={emptyCatalog} />);

      expect(html).toContain('role="status"');
      expect(html).toContain('Simulation Grid Standby');
      expect(html).toContain('No curriculum sectors are currently registered');
    });
  });

  describe('App Shell Layout', () => {
    afterEach(async () => {
      await useSettingsStore.getState().resetSettings();
      useProgressStore.getState().resetProgressState();
    });

    it('renders skip-to-content link, header, settings trigger, consent banner, data attributes, and footer', () => {
      const html = renderToStaticMarkup(
        <AppShell>
          <div>Main simulation viewport</div>
        </AppShell>,
      );

      expect(html).toContain('Skip to main content');
      expect(html).toContain('href="#main-content"');
      expect(html).toContain('id="main-content"');
      expect(html).toContain('TENSORCADE');
      expect(html).toContain('aria-label="Open settings"');
      expect(html).toContain('data-theme="dark"');
      expect(html).toContain('data-reduced-motion="false"');
      expect(html).toContain('Privacy &amp; Telemetry');
      expect(html).toContain('Main simulation viewport');
      expect(html).toContain('COOP/COEP ISOLATED');
    });

    it('reflects high-contrast theme and reduced-motion attributes on root container', () => {
      const html = renderToStaticMarkup(
        <AppShell theme="high-contrast" reducedMotion={true}>
          <div>Main simulation viewport</div>
        </AppShell>,
      );

      expect(html).toContain('data-theme="high-contrast"');
      expect(html).toContain('data-reduced-motion="true"');
    });
  });

  describe('World Map DAG Lock/Unlock, Stars, Crests, and OnboardingBanner', () => {
    afterEach(() => {
      useProgressStore.getState().resetProgressState();
    });

    it('shows OnboardingBanner when total completed levels is 0 and hides it after completion', () => {
      const zeroHtml = renderToStaticMarkup(<OnboardingBanner completedCount={0} />);
      expect(zeroHtml).toContain('Onboarding Briefing');
      expect(zeroHtml).toContain('Start Level 1.1: First Furrow -&gt;');

      const completedHtml = renderToStaticMarkup(<OnboardingBanner completedCount={1} />);
      expect(completedHtml).toBe('');
    });

    it('displays DAG locked/unlocked state, prerequisite labels, 0-3 stars, and Sensor/Assembly/Command crests', () => {
      const initialHtml = renderToStaticMarkup(<WorldMapLayout catalog={DEFAULT_WORLD_CATALOG} />);

      expect(initialHtml).toContain('aria-label="Launch Level 1: w1-robot-farm-1.1"');
      expect(initialHtml).toContain('data-locked="false"');
      expect(initialHtml).toContain(
        'aria-label="Locked Level 2: w1-robot-farm-1.2. Requires w1-robot-farm-1.1"',
      );
      expect(initialHtml).toContain('data-locked="true"');
      expect(initialHtml).toContain('aria-disabled="true"');
      expect(initialHtml).toContain('Start Level 1.1: First Furrow -&gt;');

      const unlockedHtml = renderToStaticMarkup(
        <WorldMapLayout
          catalog={DEFAULT_WORLD_CATALOG}
          progress={{
            'w1-robot-farm-1.1': {
              levelId: 'w1-robot-farm-1.1',
              worldId: 'world-1',
              starsEarned: 3,
              clearedModes: ['explorer', 'builder', 'hacker'],
              attempts: 3,
              bestScore: 1000,
              hintTierReached: 0,
              synced: false,
              updatedAt: Date.now(),
            },
          }}
        />,
      );
      expect(unlockedHtml).toContain('aria-label="Launch Level 2: w1-robot-farm-1.2"');
      expect(unlockedHtml).toContain('aria-label="3 of 3 stars"');
      expect(unlockedHtml).toContain('Sensor');
      expect(unlockedHtml).toContain('Assembly');
      expect(unlockedHtml).toContain('Command');
      expect(unlockedHtml).not.toContain('Start Level 1.1: First Furrow -&gt;');
    });
  });

  describe('TanStack Router Shell', () => {
    it('initializes router with routeTree and index route', () => {
      expect(router).toBeDefined();
      expect(routeTree).toBeDefined();
      expect(routeTree.children).toBeDefined();
    });
  });
});
