import { describe, it, expect } from 'vitest';
import { Direction, CellType } from '@tensorcade/engine';
import type { EngineSnapshot, GridWorldState } from '@tensorcade/engine';
import { HeadlessRenderer } from './headless-renderer.js';
import { interpolateGridWorld, shortestAngleDiff } from '../interpolation.js';

function createMockGridWorldState(
  roverX = 0,
  roverY = 0,
  heading: Direction = Direction.EAST
): GridWorldState {
  const grid: number[][] = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => CellType.EMPTY as number)
  );
  grid[1]![1] = CellType.CROP;
  grid[2]![2] = CellType.ROCK;
  return {
    width: 4,
    height: 4,
    rover: {
      x: roverX,
      y: roverY,
      heading,
      energy: 100,
      inventory: 0,
    },
    grid,
    totalCropsInitial: 1,
    cropsHarvested: 0,
    crashed: false,
  };
}

function createSnapshot(state: GridWorldState, tick = 0): EngineSnapshot<GridWorldState> {
  return {
    tick,
    stateHash: 123456789n,
    stateHashHex: '00000000075bcd15',
    prngState: 42,
    state,
  };
}

describe('HeadlessRenderer & Interpolation', () => {
  describe('interpolateGridWorld', () => {
    it('accurately interpolates linear coordinates at fractional alphas', () => {
      const prev = createMockGridWorldState(0, 0, Direction.EAST);
      const curr = createMockGridWorldState(2, 0, Direction.EAST);

      const atZero = interpolateGridWorld(prev, curr, 0.0);
      expect(atZero.x).toBeCloseTo(0.0);

      const atQuarter = interpolateGridWorld(prev, curr, 0.25);
      expect(atQuarter.x).toBeCloseTo(0.5);

      const atHalf = interpolateGridWorld(prev, curr, 0.5);
      expect(atHalf.x).toBeCloseTo(1.0);

      const atThreeQuarters = interpolateGridWorld(prev, curr, 0.75);
      expect(atThreeQuarters.x).toBeCloseTo(1.5);

      const atOne = interpolateGridWorld(prev, curr, 1.0);
      expect(atOne.x).toBeCloseTo(2.0);
    });

    it('interpolates heading along shortest angular circular arc', () => {
      // West (3π/2) to North (0 / 2π) is a +90 deg turn (π/2 arc), not a 270 deg reverse spin
      const prev = createMockGridWorldState(0, 0, Direction.WEST);
      const curr = createMockGridWorldState(0, 0, Direction.NORTH);

      const diff = shortestAngleDiff(0, (3 * Math.PI) / 2);
      expect(diff).toBeCloseTo(Math.PI / 2);

      // North to West is a -90 deg turn (-π/2 arc)
      expect(shortestAngleDiff((3 * Math.PI) / 2, 0)).toBeCloseTo(-Math.PI / 2);

      // Normalized Euclidean modulo handles arbitrary negative angles
      expect(shortestAngleDiff(0, -Math.PI / 2)).toBeCloseTo(Math.PI / 2);
      expect(shortestAngleDiff(-Math.PI / 2, 0)).toBeCloseTo(-Math.PI / 2);

      const atHalf = interpolateGridWorld(prev, curr, 0.5);
      // Halfway between 270 deg and 360 deg is 315 deg (7π/4)
      expect(atHalf.rotationRad).toBeCloseTo((7 * Math.PI) / 4);
    });

    it('snaps immediately to target coordinates when reducedMotion is active', () => {
      const prev = createMockGridWorldState(0, 0, Direction.NORTH);
      const curr = createMockGridWorldState(3, 4, Direction.SOUTH);

      const interpolated = interpolateGridWorld(prev, curr, 0.35, true);
      expect(interpolated.x).toBe(3);
      expect(interpolated.y).toBe(4);
      expect(interpolated.rotationRad).toBe(Math.PI); // South
    });
  });

  describe('HeadlessRenderer', () => {
    it('initializes and produces structured draw commands', async () => {
      const renderer = new HeadlessRenderer({ width: 4, height: 4, tileSize: 16 });
      const container = { clientWidth: 640, clientHeight: 480 } as HTMLElement;
      await renderer.init(container, { width: 4, height: 4 });

      const state = createMockGridWorldState(1, 1, Direction.EAST);
      const snapshot = createSnapshot(state, 1);

      renderer.render(snapshot, 0.5);

      const commands = renderer.getDrawCommands();
      expect(commands.length).toBeGreaterThan(0);

      // Verify command types present
      const types = commands.map((c) => c.type);
      expect(types).toContain('CLEAR_BACKGROUND');
      expect(types).toContain('DRAW_TILE');
      expect(types).toContain('DRAW_CROP');
      expect(types).toContain('DRAW_ROCK');
      expect(types).toContain('DRAW_ROVER');

      const metrics = renderer.getDrawMetrics();
      expect(metrics.frameCount).toBe(1);
      expect(metrics.totalDrawCalls).toBe(commands.length);
      expect(metrics.integerScale).toBeGreaterThanOrEqual(1);
    });

    it('draws crash hazard indicator when rover crashes', () => {
      const renderer = new HeadlessRenderer({ width: 4, height: 4 });
      const state = createMockGridWorldState(2, 2, Direction.SOUTH);
      state.crashed = true;
      const snapshot = createSnapshot(state, 5);

      renderer.render(snapshot, 1.0);

      const commands = renderer.getDrawCommands();
      const hasCrashIndicator = commands.some((c) => c.type === 'DRAW_CRASH_HAZARD');
      expect(hasCrashIndicator).toBe(true);
    });

    it('produces 100% bit-identical frame history digests across identical replay runs', () => {
      const runReplay = () => {
        const renderer = new HeadlessRenderer({ width: 4, height: 4, tileSize: 16 });

        // Simulate 5 ticks with 3 sub-frame interpolation steps each (alpha 0.0, 0.5, 1.0)
        for (let tick = 0; tick < 5; tick++) {
          const state = createMockGridWorldState(tick % 4, Math.floor(tick / 4), Direction.EAST);
          const snap = createSnapshot(state, tick);
          for (const alpha of [0.0, 0.5, 1.0]) {
            renderer.render(snap, alpha);
          }
        }
        return renderer.getFrameHistory();
      };

      const run1 = runReplay();
      const run2 = runReplay();

      expect(run1.length).toBe(15);
      expect(run1).toEqual(run2);
    });
  });
});
