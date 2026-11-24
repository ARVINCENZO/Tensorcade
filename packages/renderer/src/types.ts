/**
 * Core Renderer Interfaces & Types.
 *
 * Conforms to docs/11-lld.md §2 and §7.1 and ADR-001 / ADR-019:
 * - Decoupled one-way presentation pipeline (simulation state in -> draw calls out).
 * - Zero mutation authority over simulation state.
 * - Integer pixel scaling and Device Pixel Ratio (DPR) calibration.
 * - Headless test recording and smooth tick interpolation.
 */

import type { EngineSnapshot } from '@tensorcade/engine';

/**
 * Performance telemetry emitted by the renderer per frame.
 */
export interface DrawMetrics {
  readonly frameCount: number;
  readonly lastFrameTimeMs: number;
  readonly totalDrawCalls: number;
  readonly visibleSprites: number;
  readonly integerScale: number;
  readonly dpr: number;
}

/**
 * Universal Renderer Contract for 2D/3D game viewports.
 * @template TState Internal domain state (e.g. GridWorldState)
 * @template TConfig Viewport initialization configuration
 */
export interface Renderer<TState, TConfig = unknown> {
  /**
   * Initializes the rendering canvas within the target container.
   */
  init(container: HTMLElement, config: TConfig): Promise<void>;

  /**
   * Renders a frame using a read-only state snapshot and an interpolation alpha [0.0, 1.0].
   */
  render(snapshot: Readonly<EngineSnapshot<TState>>, alpha: number): void;

  /**
   * Resizes viewport when container dimensions change, recalculating integer scale.
   */
  resize(width: number, height: number): void;

  /**
   * Releases WebGL/WebGPU context, canvas listeners, and textures.
   */
  destroy(): void;

  /**
   * Returns the underlying canvas element (null in headless mode).
   */
  getCanvas(): HTMLCanvasElement | null;

  /**
   * Retrieves frame telemetry and performance metrics.
   */
  getDrawMetrics(): DrawMetrics;
}

/**
 * Grid-world viewport configuration.
 */
export interface GridWorldRenderConfig {
  readonly width: number; // Grid width in tiles
  readonly height: number; // Grid height in tiles
  readonly tileSize?: number; // Base tile size in px (defaults to 16)
  readonly maxDpr?: number; // DPR ceiling (defaults to 2.0 per art direction)
  readonly reducedMotion?: boolean; // When true, snaps animations without interpolation
}

/**
 * Interpolated rover state for smooth 60 Hz rendering.
 */
export interface InterpolatedRoverState {
  readonly x: number; // Continuous tile coordinate
  readonly y: number; // Continuous tile coordinate
  readonly rotationRad: number; // Continuous angle in radians (0 = North, π/2 = East, etc.)
  readonly energy: number;
  readonly inventory: number;
}

/**
 * Replay playback operational modes.
 */
export type ReplayPlaybackState = 'PLAYING' | 'PAUSED' | 'STEPPING' | 'COMPLETED';

/**
 * Playback speed multiplier options.
 */
export type PlaybackSpeed = 0.25 | 0.5 | 1 | 2 | 4;

/**
 * Replay viewer controller state.
 */
export interface ReplayControlsState {
  readonly playbackState: ReplayPlaybackState;
  readonly currentTick: number;
  readonly totalTicks: number;
  readonly speed: PlaybackSpeed;
  readonly isMuted: boolean;
}
