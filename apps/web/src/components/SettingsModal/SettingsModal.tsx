import * as React from 'react';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@tensorcade/ui';
import type { ThemeMode, UserSettings } from '../../storage/db.js';
import { useSettingsStore } from '../../storage/useSettingsStore.js';

export interface SettingsModalProps {
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  trigger?: React.ReactNode | undefined;
}

interface ShortcutEntry {
  readonly keys: string;
  readonly description: string;
}

const KEYBOARD_SHORTCUTS: readonly ShortcutEntry[] = [
  { keys: 'Ctrl+Enter', description: 'Execute code in active simulation' },
  { keys: 'Ctrl+R', description: 'Reset simulation state to tick 0' },
  { keys: 'Space', description: 'Play/pause replay (when viewport focused) or step simulation' },
  { keys: '1-4', description: 'Set replay playback speed (0.5x to 4x when viewport focused)' },
];

interface SettingToggleRowProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onToggle: (next: boolean) => void;
}

function SettingToggleRow({
  id,
  label,
  description,
  checked,
  onToggle,
}: SettingToggleRowProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[var(--tc-radius-sm)] border border-[var(--tc-border-subtle)] bg-[var(--tc-bg-base)] p-3">
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className="text-sm font-medium text-[var(--tc-text-primary)]">
          {label}
        </label>
        <p className="text-xs text-[var(--tc-text-muted)]">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onToggle(!checked)}
        className={`inline-flex h-7 min-w-14 items-center justify-center rounded-[var(--tc-radius-sm)] border px-2.5 font-mono text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--tc-accent-cyan)] focus-visible:outline-offset-[var(--tc-focus-outline-offset)] ${
          checked
            ? 'border-[var(--tc-accent-cyan)] bg-[var(--tc-accent-cyan)] text-[var(--tc-bg-base)]'
            : 'border-[var(--tc-border-subtle)] bg-[var(--tc-bg-surface)] text-[var(--tc-text-muted)] hover:text-[var(--tc-text-primary)]'
        }`}
      >
        {checked ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}

const THEME_OPTIONS: ReadonlyArray<{ value: ThemeMode; label: string }> = [
  { value: 'dark', label: 'Dark' },
  { value: 'high-contrast', label: 'High Contrast' },
];

export interface SettingsPanelProps {
  settings?:
    | Partial<Pick<UserSettings, 'theme' | 'reducedMotion' | 'lowSpecMode' | 'acousticTelemetry'>>
    | undefined;
}

/**
 * Inner settings panel rendered inside SettingsModal (exported for direct SSR/unit testing).
 */
export function SettingsPanel({ settings }: SettingsPanelProps = {}): React.JSX.Element {
  const storeTheme = useSettingsStore((state) => state.theme);
  const storeReducedMotion = useSettingsStore((state) => state.reducedMotion);
  const storeLowSpecMode = useSettingsStore((state) => state.lowSpecMode);
  const storeAcousticTelemetry = useSettingsStore((state) => state.acousticTelemetry);
  const theme = settings?.theme ?? storeTheme;
  const reducedMotion = settings?.reducedMotion ?? storeReducedMotion;
  const lowSpecMode = settings?.lowSpecMode ?? storeLowSpecMode;
  const acousticTelemetry = settings?.acousticTelemetry ?? storeAcousticTelemetry;
  const setTheme = useSettingsStore((state) => state.setTheme);
  const setReducedMotion = useSettingsStore((state) => state.setReducedMotion);
  const setLowSpecMode = useSettingsStore((state) => state.setLowSpecMode);
  const setAcousticTelemetry = useSettingsStore((state) => state.setAcousticTelemetry);

  return (
    <div className="flex flex-col gap-5 py-2">
      {/* Theme Selector */}
      <section aria-label="Theme selection" className="flex flex-col gap-2">
        <span className="font-mono text-xs uppercase tracking-wider text-[var(--tc-text-muted)]">
          Display Theme
        </span>
        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-2 gap-2">
          {THEME_OPTIONS.map((option) => {
            const selected = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => void setTheme(option.value)}
                className={`rounded-[var(--tc-radius-sm)] border px-3 py-2 font-mono text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--tc-accent-cyan)] focus-visible:outline-offset-[var(--tc-focus-outline-offset)] ${
                  selected
                    ? 'border-[var(--tc-accent-cyan)] bg-[var(--tc-accent-cyan)] text-[var(--tc-bg-base)]'
                    : 'border-[var(--tc-border-subtle)] bg-[var(--tc-bg-base)] text-[var(--tc-text-primary)] hover:border-[var(--tc-text-muted)]'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Toggle Controls */}
      <section aria-label="Simulation preferences" className="flex flex-col gap-2.5">
        <span className="font-mono text-xs uppercase tracking-wider text-[var(--tc-text-muted)]">
          Preferences
        </span>
        <SettingToggleRow
          id="setting-reduced-motion"
          label="Reduced Motion"
          description="Minimize non-essential UI transitions and canvas animations."
          checked={reducedMotion}
          onToggle={(next) => void setReducedMotion(next)}
        />
        <SettingToggleRow
          id="setting-low-spec-mode"
          label="Low-Spec Mode"
          description="Reduce visual effects and particle density for lower-power hardware."
          checked={lowSpecMode}
          onToggle={(next) => void setLowSpecMode(next)}
        />
        <SettingToggleRow
          id="setting-acoustic-telemetry"
          label="Acoustic Telemetry (Audio Engine Pending)"
          description="Synthesize subtle audio cues for simulation events (muted by default; audio synthesizer not yet enabled)."
          checked={acousticTelemetry}
          onToggle={(next) => void setAcousticTelemetry(next)}
        />
      </section>

      {/* Keyboard Shortcuts Reference Table */}
      <section aria-label="Keyboard shortcuts reference" className="flex flex-col gap-2">
        <span className="font-mono text-xs uppercase tracking-wider text-[var(--tc-text-muted)]">
          Keyboard Shortcuts
        </span>
        <div className="overflow-hidden rounded-[var(--tc-radius-sm)] border border-[var(--tc-border-subtle)] bg-[var(--tc-bg-base)]">
          <table className="w-full text-left text-xs" aria-label="Keyboard shortcuts">
            <thead className="border-b border-[var(--tc-border-subtle)] bg-[var(--tc-bg-surface)] font-mono text-[var(--tc-text-muted)]">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Shortcut
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--tc-border-subtle)]">
              {KEYBOARD_SHORTCUTS.map((entry) => (
                <tr key={entry.keys}>
                  <td className="px-3 py-2 font-mono">
                    <kbd className="rounded-[var(--tc-radius-sm)] border border-[var(--tc-border-subtle)] bg-[var(--tc-bg-surface)] px-1.5 py-0.5 text-[var(--tc-accent-cyan)]">
                      {entry.keys}
                    </kbd>
                  </td>
                  <td className="px-3 py-2 text-[var(--tc-text-primary)]">{entry.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/**
 * Accessible Radix Dialog for configuring theme, accessibility, performance,
 * acoustic telemetry, and viewing simulation keyboard shortcuts.
 */
export function SettingsModal({
  open,
  onOpenChange,
  trigger,
}: SettingsModalProps): React.JSX.Element {
  const resetSettings = useSettingsStore((state) => state.resetSettings);

  const dialogProps =
    open !== undefined ? { open, onOpenChange } : onOpenChange ? { onOpenChange } : {};

  return (
    <Dialog {...dialogProps}>
      {trigger !== undefined ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : open === undefined ? (
        <DialogTrigger asChild>
          <Button variant="secondary" size="sm" aria-label="Open settings">
            Settings
          </Button>
        </DialogTrigger>
      ) : null}

      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono">System Settings</DialogTitle>
          <DialogDescription>
            Configure visual contrast, motion preferences, hardware profile, and audio cues.
          </DialogDescription>
        </DialogHeader>

        <SettingsPanel />

        <DialogFooter className="gap-2 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => void resetSettings()}>
            Reset Defaults
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="primary" size="sm">
              Done
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
