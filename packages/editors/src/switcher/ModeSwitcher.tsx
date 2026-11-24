import * as React from 'react';
import type { PlayMode } from '@tensorcade/contracts';
import { cn } from '@tensorcade/ui';
import { ALL_PLAY_MODES, type ModeOption, type ModeSwitcherProps } from './types.js';

/**
 * Accessible segmented tab control for switching between Explorer, Builder, and Hacker modes.
 *
 * Conforms to WAI-ARIA tablist patterns and is filtered by `supportedModes`.
 */
export function ModeSwitcher({
  currentMode,
  supportedModes,
  onModeChange,
  disabled = false,
  className,
}: ModeSwitcherProps): React.JSX.Element | null {
  const tabsListRef = React.useRef<HTMLDivElement | null>(null);

  // Filter modes according to level support (or default to all standard modes)
  const availableModes: ReadonlyArray<ModeOption> = React.useMemo(() => {
    if (!supportedModes || supportedModes.length === 0) {
      return ALL_PLAY_MODES;
    }
    const supportedSet = new Set<PlayMode>(supportedModes);
    return ALL_PLAY_MODES.filter((item) => supportedSet.has(item.mode));
  }, [supportedModes]);

  // If level only supports 1 mode (e.g. ['hacker']), switching is disabled and unnecessary
  if (availableModes.length <= 1) {
    return null;
  }

  // Handle keyboard arrow navigation across tabs (WAI-ARIA tabs pattern)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (disabled || availableModes.length <= 1) return;

    const currentIndex = availableModes.findIndex((item) => item.mode === currentMode);
    if (currentIndex === -1) return;

    let targetIndex = -1;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        targetIndex = (currentIndex + 1) % availableModes.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        targetIndex = (currentIndex - 1 + availableModes.length) % availableModes.length;
        break;
      case 'Home':
        e.preventDefault();
        targetIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        targetIndex = availableModes.length - 1;
        break;
      default:
        return;
    }

    const nextMode = availableModes[targetIndex]?.mode;
    if (nextMode && nextMode !== currentMode) {
      onModeChange(nextMode);
      // Focus corresponding tab button
      const targetBtn = tabsListRef.current?.querySelector<HTMLButtonElement>(
        `[data-mode="${nextMode}"]`
      );
      targetBtn?.focus();
    }
  };

  return (
    <div
      ref={tabsListRef}
      role="tablist"
      aria-label="Editor Play Mode"
      aria-orientation="horizontal"
      onKeyDown={handleKeyDown}
      className={cn(
        'inline-flex items-center gap-1 rounded-[var(--tc-radius-sm)] border border-[var(--tc-border-subtle)] bg-[var(--tc-bg-surface)] p-1 text-[var(--tc-text-muted)]',
        disabled && 'opacity-60 pointer-events-none',
        className
      )}
    >
      {availableModes.map((opt) => {
        const isSelected = opt.mode === currentMode;
        return (
          <button
            key={opt.mode}
            type="button"
            role="tab"
            id={`tc-mode-tab-${opt.mode}`}
            data-mode={opt.mode}
            aria-selected={isSelected}
            aria-controls={`tc-mode-panel-${opt.mode}`}
            tabIndex={isSelected ? 0 : -1}
            disabled={disabled}
            onClick={() => {
              if (!disabled && opt.mode !== currentMode) {
                onModeChange(opt.mode);
              }
            }}
            title={opt.description}
            className={cn(
              'group relative inline-flex items-center justify-center whitespace-nowrap rounded-[var(--tc-radius-sm)] px-3 py-1.5 text-xs font-medium transition-all duration-150',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--tc-accent-cyan)] focus-visible:outline-offset-[var(--tc-focus-outline-offset)]',
              'cursor-pointer select-none',
              isSelected
                ? 'bg-[var(--tc-bg-base)] text-[var(--tc-accent-cyan)] shadow-sm border border-[var(--tc-accent-cyan)]/30 font-semibold'
                : 'text-[var(--tc-text-muted)] hover:text-[var(--tc-text-primary)] hover:bg-[var(--tc-border-subtle)]/30 border border-transparent'
            )}
          >
            <span>{opt.label}</span>
            <span
              className={cn(
                'ml-1.5 rounded-[var(--tc-radius-sm)] px-1.5 py-0.2 text-[10px] font-mono transition-colors uppercase tracking-wider',
                isSelected
                  ? 'bg-[var(--tc-accent-cyan)]/15 text-[var(--tc-accent-cyan)] font-bold'
                  : 'bg-[var(--tc-border-subtle)] text-[var(--tc-text-muted)] group-hover:text-[var(--tc-text-primary)]'
              )}
            >
              {opt.badge}
            </span>
          </button>
        );
      })}
    </div>
  );
}
