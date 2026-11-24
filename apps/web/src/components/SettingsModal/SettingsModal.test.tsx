import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { useSettingsStore } from '../../storage/useSettingsStore.js';
import { SettingsModal, SettingsPanel } from './SettingsModal.js';

afterEach(async () => {
  await useSettingsStore.getState().resetSettings();
});

describe('SettingsModal & useSettingsStore integration', () => {
  it('renders an accessible settings trigger button by default', () => {
    const html = renderToStaticMarkup(<SettingsModal />);
    expect(html).toContain('aria-label="Open settings"');
    expect(html).toContain('Settings');
  });

  it('renders theme options, accessibility/hardware toggles, and acoustic telemetry muted by default', () => {
    const html = renderToStaticMarkup(<SettingsPanel />);

    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('Dark');
    expect(html).toContain('High Contrast');
    expect(html).toContain('Reduced Motion');
    expect(html).toContain('Low-Spec Mode');
    expect(html).toContain('Acoustic Telemetry');
    expect(html).toContain('muted by default');

    const state = useSettingsStore.getState();
    expect(state.theme).toBe('dark');
    expect(state.reducedMotion).toBe(false);
    expect(state.lowSpecMode).toBe(false);
    expect(state.acousticTelemetry).toBe(false);
  });

  it('renders the keyboard shortcuts reference table with Ctrl+Enter, Ctrl+R, Space, and 1-4', () => {
    const html = renderToStaticMarkup(<SettingsPanel />);

    expect(html).toContain('<table');
    expect(html).toContain('aria-label="Keyboard shortcuts"');
    expect(html).toContain('Ctrl+Enter');
    expect(html).toContain('Ctrl+R');
    expect(html).toContain('Space');
    expect(html).toContain('1-4');
    expect(html).toContain('playback speed');
    expect(html).not.toContain('Select play mode or hint tier');
  });

  it('updates theme, reducedMotion, lowSpecMode, and acousticTelemetry in store and reflects in rendered panel', async () => {
    await useSettingsStore.getState().setTheme('high-contrast');
    await useSettingsStore.getState().setReducedMotion(true);
    await useSettingsStore.getState().setLowSpecMode(true);
    await useSettingsStore.getState().setAcousticTelemetry(true);

    const state = useSettingsStore.getState();
    expect(state.theme).toBe('high-contrast');
    expect(state.reducedMotion).toBe(true);
    expect(state.lowSpecMode).toBe(true);
    expect(state.acousticTelemetry).toBe(true);

    const html = renderToStaticMarkup(
      <SettingsPanel
        settings={{
          theme: state.theme,
          reducedMotion: state.reducedMotion,
          lowSpecMode: state.lowSpecMode,
          acousticTelemetry: state.acousticTelemetry,
        }}
      />,
    );
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('>ON<');
    expect(html).not.toContain('>OFF<');
  });
});
