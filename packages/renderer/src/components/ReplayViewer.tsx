/**
 * ReplayViewer: Accessible Interactive Game Replay Player.
 *
 * Conforms to docs/03-art-direction.md §7 (Accessibility), docs/11-lld.md §7.1,
 * and docs/QUALITY_BAR.md:
 * - Play / Pause / Step / Scrub / Speed controls.
 * - Full keyboard navigation: Space (play/pause), Arrows (step), Home/End, 1-4 (speed).
 * - High-contrast focus rings (outline 2px solid #38BDF8).
 * - Accessible DOM mirror with live announcements (aria-live="polite") and grid table.
 * - Decoupled rendering: consumes read-only snapshots, zero sim mutation.
 */

import * as React from 'react';
import type { EngineSnapshot, GridWorldState } from '@tensorcade/engine';
import { Direction, CellType } from '@tensorcade/engine';
import { HeadlessRenderer } from '../headless/headless-renderer.js';
import { PixiGridWorldRenderer } from '../pixi/pixi-renderer.js';
import type { GridWorldRenderConfig, PlaybackSpeed, Renderer } from '../types.js';

export interface ReplayViewerProps {
  /**
   * Chronological list of snapshots from tick 0 to terminal tick.
   */
  readonly snapshots: ReadonlyArray<EngineSnapshot<GridWorldState>>;
  /**
   * Viewport and grid dimensions configuration.
   */
  readonly config: GridWorldRenderConfig;
  /**
   * Title displayed in HUD header.
   */
  readonly levelTitle?: string;
  /**
   * Custom renderer instance (defaults to PixiGridWorldRenderer, or HeadlessRenderer).
   */
  readonly customRenderer?: Renderer<GridWorldState, GridWorldRenderConfig>;
  /**
   * Callback fired whenever the current tick changes.
   */
  readonly onTickChange?: ((tick: number) => void) | undefined;
  /**
   * Optional controlled snapshot index [0, snapshots.length - 1].
   */
  readonly tickIndex?: number | undefined;
  /**
   * Optional callback fired whenever the snapshot index changes.
   */
  readonly onTickIndexChange?: ((tickIndex: number) => void) | undefined;
  /**
   * Optional controlled playback speed multiplier.
   */
  readonly speed?: PlaybackSpeed | undefined;
  /**
   * Optional callback fired whenever playback speed changes.
   */
  readonly onSpeedChange?: ((speed: PlaybackSpeed) => void) | undefined;
  /**
   * Additional root CSS class.
   */
  readonly className?: string | undefined;
}

const DIRECTION_NAMES: Record<number, string> = {
  [Direction.NORTH]: 'North',
  [Direction.EAST]: 'East',
  [Direction.SOUTH]: 'South',
  [Direction.WEST]: 'West',
};

const CELL_TYPE_NAMES: Record<number, string> = {
  [CellType.EMPTY]: 'Empty',
  [CellType.CROP]: 'Crop',
  [CellType.ROCK]: 'Rock',
  [CellType.RAVINE]: 'Ravine',
  [CellType.BASE]: 'Recharge Base',
};

export function formatCrashReason(reason?: string): string {
  switch (reason) {
    case 'COLLIDED_WITH_ROCK':
      return 'Collided with rock obstacle';
    case 'CRASHED_INTO_RAVINE':
      return 'Fell into ravine hazard';
    case 'ENERGY_DEPLETED':
      return 'Battery energy depleted before completing harvest';
    case 'OUT_OF_BOUNDS_COLLISION':
      return 'Moved outside farm perimeter bounds';
    case 'MULTIPLE_ACTIONS_PER_TICK':
      return 'Multiple conflicting actions submitted on one tick';
    default:
      return reason ?? 'Hazard impact';
  }
}

export const ReplayViewer: React.FC<ReplayViewerProps> = ({
  snapshots,
  config,
  levelTitle = 'Robot Farm Level 1.1',
  customRenderer,
  onTickChange,
  tickIndex: controlledTickIndex,
  onTickIndexChange,
  speed: controlledSpeed,
  onSpeedChange,
  className = '',
}) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const rendererRef = React.useRef<Renderer<GridWorldState, GridWorldRenderConfig> | null>(null);

  const [internalTickIndex, setInternalTickIndex] = React.useState<number>(0);
  const [isPlaying, setIsPlaying] = React.useState<boolean>(false);
  const [internalSpeed, setInternalSpeed] = React.useState<PlaybackSpeed>(1);

  const currentTickIndex = controlledTickIndex ?? internalTickIndex;
  const speed = controlledSpeed ?? internalSpeed;

  const setCurrentTickIndex = React.useCallback(
    (next: number) => {
      if (controlledTickIndex === undefined) {
        setInternalTickIndex(next);
      }
      onTickIndexChange?.(next);
    },
    [controlledTickIndex, onTickIndexChange],
  );

  const setSpeed = React.useCallback(
    (next: PlaybackSpeed) => {
      if (controlledSpeed === undefined) {
        setInternalSpeed(next);
      }
      onSpeedChange?.(next);
    },
    [controlledSpeed, onSpeedChange],
  );

  const totalTicks = Math.max(0, snapshots.length - 1);
  const safeIndex = Math.min(Math.max(currentTickIndex, 0), totalTicks);
  const safeIndexRef = React.useRef<number>(safeIndex);
  safeIndexRef.current = safeIndex;
  const currentSnapshot = snapshots[safeIndex] ?? snapshots[0];
  const state = currentSnapshot?.state;

  const width = config.width;
  const height = config.height;
  const tileSize = config.tileSize;
  const maxDpr = config.maxDpr;
  const reducedMotion = config.reducedMotion;

  const stableConfig = React.useMemo<GridWorldRenderConfig>(() => {
    const cfg: {
      width: number;
      height: number;
      tileSize?: number;
      maxDpr?: number;
      reducedMotion?: boolean;
    } = { width, height };
    if (tileSize !== undefined) cfg.tileSize = tileSize;
    if (maxDpr !== undefined) cfg.maxDpr = maxDpr;
    if (reducedMotion !== undefined) cfg.reducedMotion = reducedMotion;
    return cfg;
  }, [width, height, tileSize, maxDpr, reducedMotion]);

  // Initialize renderer on mount
  React.useEffect(() => {
    if (!containerRef.current) return;

    const renderer =
      customRenderer ??
      (typeof document !== 'undefined'
        ? new PixiGridWorldRenderer(stableConfig)
        : new HeadlessRenderer(stableConfig));

    rendererRef.current = renderer;
    void renderer.init(containerRef.current, stableConfig);

    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [stableConfig, customRenderer]);

  // Handle render updates on tick change
  React.useEffect(() => {
    if (rendererRef.current && currentSnapshot) {
      rendererRef.current.render(currentSnapshot, 1.0);
    }
    onTickChange?.(currentSnapshot?.tick ?? 0);
  }, [currentSnapshot, onTickChange]);

  // Resize handling
  React.useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && rendererRef.current) {
        rendererRef.current.resize(
          containerRef.current.clientWidth || 640,
          containerRef.current.clientHeight || 480,
        );
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Playback timer loop
  React.useEffect(() => {
    if (!isPlaying) return;

    let animFrameId: number;
    let lastTimestamp = performance.now();
    let accumulatedMs = 0;
    const tickIntervalMs = 1000 / 60; // 16.666ms per tick at 1x

    const loop = (now: number) => {
      const delta = now - lastTimestamp;
      lastTimestamp = now;
      accumulatedMs += delta * speed;

      while (accumulatedMs >= tickIntervalMs) {
        accumulatedMs -= tickIntervalMs;
        if (safeIndexRef.current >= totalTicks) {
          setIsPlaying(false);
          break;
        }
        const nextIndex = safeIndexRef.current + 1;
        safeIndexRef.current = nextIndex;
        setCurrentTickIndex(nextIndex);
      }

      animFrameId = requestAnimationFrame(loop);
    };

    animFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameId);
  }, [isPlaying, speed, totalTicks, setCurrentTickIndex]);

  // Step and navigation actions
  const togglePlay = React.useCallback(() => {
    setIsPlaying((prev) => {
      if (!prev && safeIndexRef.current >= totalTicks) {
        setCurrentTickIndex(0);
        return true;
      }
      return !prev;
    });
  }, [totalTicks, setCurrentTickIndex]);

  const stepForward = React.useCallback(() => {
    setIsPlaying(false);
    setCurrentTickIndex(Math.min(safeIndexRef.current + 1, totalTicks));
  }, [totalTicks, setCurrentTickIndex]);

  const stepBackward = React.useCallback(() => {
    setIsPlaying(false);
    setCurrentTickIndex(Math.max(safeIndexRef.current - 1, 0));
  }, [setCurrentTickIndex]);

  const resetToStart = React.useCallback(() => {
    setIsPlaying(false);
    setCurrentTickIndex(0);
  }, [setCurrentTickIndex]);

  const jumpToEnd = React.useCallback(() => {
    setIsPlaying(false);
    setCurrentTickIndex(totalTicks);
  }, [totalTicks, setCurrentTickIndex]);

  // Keyboard navigation shortcuts
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          stepForward();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          stepBackward();
          break;
        case 'Home':
          e.preventDefault();
          resetToStart();
          break;
        case 'End':
          e.preventDefault();
          jumpToEnd();
          break;
        case '1':
          setSpeed(0.5);
          break;
        case '2':
          setSpeed(1);
          break;
        case '3':
          setSpeed(2);
          break;
        case '4':
          setSpeed(4);
          break;
        case 'r':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            resetToStart();
          }
          break;
      }
    },
    [togglePlay, stepForward, stepBackward, resetToStart, jumpToEnd, setSpeed],
  );

  const headingText = state ? (DIRECTION_NAMES[state.rover.heading] ?? 'Unknown') : '';

  return (
    <div
      role="region"
      aria-label={`Replay Player for ${levelTitle}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`flex flex-col bg-[var(--tc-bg-base,#0B0F17)] border border-[var(--tc-border-subtle,#232E42)] rounded-lg overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tc-accent-cyan,#38BDF8)] text-[var(--tc-text-primary,#F8FAFC)] font-mono ${className}`}
    >
      {/* 1. HUD Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--tc-bg-surface,#151C28)] border-b border-[var(--tc-border-subtle,#232E42)] text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold tracking-wider text-[var(--tc-accent-cyan,#38BDF8)] uppercase">
            {levelTitle}
          </span>
          <span className="text-[var(--tc-text-muted,#94A3B8)]">|</span>
          <span>
            Tick <strong className="text-[var(--tc-accent-amber,#F59E0B)]">{safeIndex}</strong> /{' '}
            {totalTicks}
          </span>
        </div>

        {state && (
          <div className="flex items-center gap-4 text-[11px] text-[var(--tc-text-muted,#94A3B8)]">
            <span>
              Energy:{' '}
              <strong
                className={
                  state.rover.energy <= 20
                    ? 'text-[var(--tc-accent-crimson,#FB7185)]'
                    : 'text-[var(--tc-accent-emerald,#10B981)]'
                }
              >
                {state.rover.energy}%
              </strong>
            </span>
            <span>
              Crops:{' '}
              <strong className="text-[var(--tc-accent-emerald,#10B981)]">
                {state.cropsHarvested}/{state.totalCropsInitial}
              </strong>
            </span>
            <span className="hidden sm:inline">
              Hash:{' '}
              <span className="text-[var(--tc-text-muted,#94A3B8)]">
                {currentSnapshot?.stateHashHex?.slice(0, 8) ?? '—'}
              </span>
            </span>
            {state.crashed && (
              <span
                className={`text-[var(--tc-accent-crimson,#FB7185)] font-bold${reducedMotion ? '' : ' animate-pulse'}`}
                title={formatCrashReason(state.crashReason)}
              >
                [CRASHED] {formatCrashReason(state.crashReason)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 2. Visual Canvas Viewport */}
      <div
        ref={containerRef}
        className="relative flex items-center justify-center min-h-[300px] w-full bg-[var(--tc-bg-base,#0B0F17)] overflow-hidden"
      >
        {/* Accessible Screen-Reader DOM Mirror (WCAG 2.2 AA) */}
        {state && (
          <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            <p>
              Tick {safeIndex} of {totalTicks}. Rover positioned at column {state.rover.x + 1}, row{' '}
              {state.rover.y + 1}, facing {headingText}. Energy: {state.rover.energy} percent.
              Harvested {state.cropsHarvested} of {state.totalCropsInitial} crops.
              {state.crashed ? ` Vehicle crashed: ${formatCrashReason(state.crashReason)}.` : ''}
            </p>
            <table>
              <caption>Simulation Field Grid State</caption>
              <tbody>
                {state.grid.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx}>
                        {state.rover.x === cIdx && state.rover.y === rIdx
                          ? cell !== CellType.EMPTY
                            ? `Rover (${headingText}) on ${CELL_TYPE_NAMES[cell] ?? 'Tile'}`
                            : `Rover (${headingText})`
                          : (CELL_TYPE_NAMES[cell] ?? 'Empty')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Replay Controls Tray */}
      <div className="flex flex-col gap-2 p-3 bg-[var(--tc-bg-surface,#151C28)] border-t border-[var(--tc-border-subtle,#232E42)]">
        {/* Scrubber slider */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[var(--tc-text-muted,#94A3B8)] w-8 text-right">0</span>
          <input
            type="range"
            min="0"
            max={totalTicks}
            value={safeIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentTickIndex(parseInt(e.target.value, 10));
            }}
            aria-label="Replay Scrubbing Timeline"
            className="w-full h-1.5 bg-[var(--tc-border-subtle,#232E42)] rounded-lg appearance-none cursor-pointer accent-[var(--tc-accent-cyan,#38BDF8)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--tc-accent-cyan,#38BDF8)]"
          />
          <span className="text-[10px] text-[var(--tc-text-muted,#94A3B8)] w-8">{totalTicks}</span>
        </div>

        {/* Action Buttons & Speed bar */}
        <div className="flex items-center justify-between text-xs pt-1">
          <div className="flex items-center gap-2">
            {/* Reset */}
            <button
              type="button"
              onClick={resetToStart}
              aria-label="Reset to Tick 0 (Home)"
              className="px-2 py-1 bg-[var(--tc-bg-base,#0B0F17)] border border-[var(--tc-border-subtle,#232E42)] rounded hover:bg-[var(--tc-border-subtle,#232E42)] text-[var(--tc-text-muted,#94A3B8)] hover:text-white transition-colors"
            >
              ⏮
            </button>

            {/* Step Back */}
            <button
              type="button"
              onClick={stepBackward}
              aria-label="Step Backward 1 Tick (Left Arrow)"
              className="px-2 py-1 bg-[var(--tc-bg-base,#0B0F17)] border border-[var(--tc-border-subtle,#232E42)] rounded hover:bg-[var(--tc-border-subtle,#232E42)] text-[var(--tc-text-muted,#94A3B8)] hover:text-white transition-colors"
            >
              ◀
            </button>

            {/* Play / Pause */}
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              className="px-3 py-1 bg-[var(--tc-accent-cyan,#38BDF8)] text-[var(--tc-bg-base,#0B0F17)] font-bold rounded hover:opacity-90 transition-opacity"
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>

            {/* Step Forward */}
            <button
              type="button"
              onClick={stepForward}
              aria-label="Step Forward 1 Tick (Right Arrow)"
              className="px-2 py-1 bg-[var(--tc-bg-base,#0B0F17)] border border-[var(--tc-border-subtle,#232E42)] rounded hover:bg-[var(--tc-border-subtle,#232E42)] text-[var(--tc-text-muted,#94A3B8)] hover:text-white transition-colors"
            >
              ▶
            </button>

            {/* Jump to End */}
            <button
              type="button"
              onClick={jumpToEnd}
              aria-label="Jump to End (End)"
              className="px-2 py-1 bg-[var(--tc-bg-base,#0B0F17)] border border-[var(--tc-border-subtle,#232E42)] rounded hover:bg-[var(--tc-border-subtle,#232E42)] text-[var(--tc-text-muted,#94A3B8)] hover:text-white transition-colors"
            >
              ⏭
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-[var(--tc-text-muted,#94A3B8)] mr-1 hidden sm:inline">
              Speed:
            </span>
            {([0.5, 1, 2, 4] as const).map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setSpeed(spd)}
                aria-pressed={speed === spd}
                className={`px-1.5 py-0.5 rounded text-[11px] transition-colors ${
                  speed === spd
                    ? 'bg-[var(--tc-accent-cyan,#38BDF8)] text-[var(--tc-bg-base,#0B0F17)] font-bold'
                    : 'bg-[var(--tc-bg-base,#0B0F17)] border border-[var(--tc-border-subtle,#232E42)] text-[var(--tc-text-muted,#94A3B8)] hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
