/**
 * Headless Simulation Renderer.
 *
 * Conforms to docs/11-lld.md §2 and ADR-001 / ADR-019:
 * - Implements the universal Renderer interface in pure TypeScript.
 * - Zero DOM, WebGL, or GPU requirements; runs cleanly in Node.js and CI.
 * - Records virtual draw commands per frame for automated visual determinism testing.
 * - Produces deterministic frame hashes proving identical visual replay sequences.
 */

import type { EngineSnapshot, GridWorldState } from '@tensorcade/engine';
import { CellType } from '@tensorcade/engine';
import { interpolateGridWorld } from '../interpolation.js';
import type {
  DrawMetrics,
  GridWorldRenderConfig,
  InterpolatedRoverState,
  Renderer,
} from '../types.js';

export type VirtualDrawCommandType =
  | 'CLEAR_BACKGROUND'
  | 'DRAW_TILE'
  | 'DRAW_ROCK'
  | 'DRAW_RAVINE'
  | 'DRAW_CROP'
  | 'DRAW_ROVER'
  | 'DRAW_CRASH_HAZARD';

export interface VirtualDrawCommand {
  readonly type: VirtualDrawCommandType;
  readonly x: number;
  readonly y: number;
  readonly width?: number;
  readonly height?: number;
  readonly color?: string;
  readonly rotationRad?: number;
  readonly cellType?: number;
  readonly energy?: number;
  readonly inventory?: number;
}

export class HeadlessRenderer implements Renderer<GridWorldState, GridWorldRenderConfig> {
  private config: Required<GridWorldRenderConfig>;
  private container: HTMLElement | null = null;
  private previousState: GridWorldState | null = null;
  private currentDrawCommands: VirtualDrawCommand[] = [];
  private frameHistory: string[] = [];
  private frameCount = 0;
  private lastFrameTimeMs = 0;
  private integerScale = 1;

  constructor(initialConfig?: GridWorldRenderConfig) {
    this.config = {
      width: initialConfig?.width ?? 10,
      height: initialConfig?.height ?? 10,
      tileSize: initialConfig?.tileSize ?? 16,
      maxDpr: initialConfig?.maxDpr ?? 2.0,
      reducedMotion: initialConfig?.reducedMotion ?? false,
    };
  }

  public async init(container: HTMLElement, config: GridWorldRenderConfig): Promise<void> {
    this.container = container;
    this.config = {
      width: config.width,
      height: config.height,
      tileSize: config.tileSize ?? 16,
      maxDpr: config.maxDpr ?? 2.0,
      reducedMotion: config.reducedMotion ?? false,
    };
    this.recalculateIntegerScale(800, 600);
    this.frameCount = 0;
    this.currentDrawCommands = [];
    this.frameHistory = [];
  }

  public render(snapshot: Readonly<EngineSnapshot<GridWorldState>>, alpha: number): void {
    const startTime = typeof performance !== 'undefined' ? performance.now() : 0;
    const currState = snapshot.state;
    const prevState = this.previousState ?? currState;

    const rover: InterpolatedRoverState = interpolateGridWorld(
      prevState,
      currState,
      alpha,
      this.config.reducedMotion,
    );

    const commands: VirtualDrawCommand[] = [];
    const tileSize = this.config.tileSize;

    // 1. Background clear
    commands.push({
      type: 'CLEAR_BACKGROUND',
      x: 0,
      y: 0,
      width: this.config.width * tileSize,
      height: this.config.height * tileSize,
      color: '#0B0F17',
    });

    // 2. Grid terrain and obstacles
    for (let y = 0; y < currState.height; y++) {
      for (let x = 0; x < currState.width; x++) {
        const cell = currState.grid[y]?.[x] ?? CellType.EMPTY;
        const posX = x * tileSize;
        const posY = y * tileSize;

        commands.push({
          type: 'DRAW_TILE',
          x: posX,
          y: posY,
          width: tileSize,
          height: tileSize,
          cellType: cell === CellType.BASE ? CellType.BASE : CellType.EMPTY,
        });

        if (cell === CellType.ROCK) {
          commands.push({
            type: 'DRAW_ROCK',
            x: posX,
            y: posY,
            width: tileSize,
            height: tileSize,
          });
        } else if (cell === CellType.RAVINE) {
          commands.push({
            type: 'DRAW_RAVINE',
            x: posX,
            y: posY,
            width: tileSize,
            height: tileSize,
            color: '#FB7185',
          });
        } else if (cell === CellType.CROP) {
          commands.push({
            type: 'DRAW_CROP',
            x: posX,
            y: posY,
            width: tileSize,
            height: tileSize,
            color: '#10B981',
          });
        }
      }
    }

    // 3. Rover entity
    commands.push({
      type: 'DRAW_ROVER',
      x: rover.x * tileSize,
      y: rover.y * tileSize,
      width: tileSize,
      height: tileSize,
      rotationRad: rover.rotationRad,
      energy: rover.energy,
      inventory: rover.inventory,
      color: '#38BDF8',
    });

    // 4. Crash hazard indicator
    if (currState.crashed) {
      commands.push({
        type: 'DRAW_CRASH_HAZARD',
        x: currState.rover.x * tileSize,
        y: currState.rover.y * tileSize,
        width: tileSize,
        height: tileSize,
        color: '#FB7185',
      });
    }

    this.currentDrawCommands = commands;
    this.previousState = currState;
    this.frameCount++;

    // Compute simple frame signature
    const frameDigest = this.computeFrameDigest(commands, snapshot.tick, alpha);
    this.frameHistory.push(frameDigest);

    const endTime = typeof performance !== 'undefined' ? performance.now() : 0;
    this.lastFrameTimeMs = endTime > startTime ? endTime - startTime : 0.05;
  }

  public resize(width: number, height: number): void {
    this.recalculateIntegerScale(width, height);
  }

  public destroy(): void {
    this.container = null;
    this.previousState = null;
    this.currentDrawCommands = [];
    this.frameHistory = [];
  }

  public getCanvas(): HTMLCanvasElement | null {
    return null;
  }

  public getDrawMetrics(): DrawMetrics {
    return {
      frameCount: this.frameCount,
      lastFrameTimeMs: this.lastFrameTimeMs,
      totalDrawCalls: this.currentDrawCommands.length,
      visibleSprites: this.currentDrawCommands.filter((c) => c.type !== 'CLEAR_BACKGROUND').length,
      integerScale: this.integerScale,
      dpr: 1.0,
    };
  }

  public getDrawCommands(): ReadonlyArray<VirtualDrawCommand> {
    return this.currentDrawCommands;
  }

  public getFrameHistory(): ReadonlyArray<string> {
    return this.frameHistory;
  }

  private recalculateIntegerScale(containerWidth: number, containerHeight: number): void {
    if (containerWidth <= 0 || containerHeight <= 0) {
      this.integerScale = 1;
      return;
    }
    const worldWidth = this.config.width * this.config.tileSize;
    const worldHeight = this.config.height * this.config.tileSize;
    if (worldWidth <= 0 || worldHeight <= 0) {
      this.integerScale = 1;
      return;
    }
    const scaleX = Math.floor(containerWidth / worldWidth);
    const scaleY = Math.floor(containerHeight / worldHeight);
    this.integerScale = Math.max(1, Math.min(scaleX, scaleY));
  }

  private computeFrameDigest(
    commands: ReadonlyArray<VirtualDrawCommand>,
    tick: number,
    alpha: number,
  ): string {
    // Quantize alpha to 3 decimal places for stable floating point hashing
    const quantizedAlpha = Math.round(alpha * 1000) / 1000;
    const summary = commands.map((c) => `${c.type}:${c.x.toFixed(2)},${c.y.toFixed(2)}`).join('|');
    return `f_${tick}_${quantizedAlpha}_[${summary}]`;
  }
}
