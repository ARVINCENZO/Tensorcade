import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { RobotFarmSimulation } from './grid-world.js';
import { resolveGridWorldConfig } from './layout-generator.js';
import { CellType, Direction, type GridWorldGeneratorType } from './types.js';

const ALL_PROCEDURAL_GENERATORS: ReadonlyArray<GridWorldGeneratorType> = [
  'first_furrow',
  'corner_corridor',
  'variable_row',
  'skip_row',
  'selective_row',
  'rock_corridor',
  'hazard_triage',
  'shifting_perimeter',
  'battery_relay',
  'multi_plot',
  'modular_plots',
  'capstone_dome',
];

describe('Deterministic Seeded Grid-World Layout Generator', () => {
  it('supports static environment configs for backward compatibility', () => {
    const cfg = resolveGridWorldConfig(
      'w1-robot-farm-1.1',
      {
        width: 4,
        height: 4,
        maxTicks: 40,
        initialRover: { x: 0, y: 0, heading: 'EAST', energy: 80, maxEnergy: 100 },
        crops: [{ x: 1, y: 0 }],
        bases: [{ x: 0, y: 0 }],
        rocks: [{ x: 3, y: 3 }],
        ravines: [{ x: 2, y: 2 }],
        star2TickThreshold: 6,
      },
      10001,
    );

    expect(cfg.width).toBe(4);
    expect(cfg.height).toBe(4);
    expect(cfg.initialRover.heading).toBe(Direction.EAST);
    expect(cfg.initialRover.maxEnergy).toBe(100);
    expect(cfg.bases).toEqual([{ x: 0, y: 0 }]);
    expect(cfg.rocks).toEqual([{ x: 3, y: 3 }]);
    expect(cfg.ravines).toEqual([{ x: 2, y: 2 }]);
    expect(cfg.star2TickThreshold).toBe(6);
  });

  it('preserves baseline (0,0) EAST -> crop (1,0) on first_furrow seed 10001 and varies other seeds', () => {
    const base = resolveGridWorldConfig('w1-robot-farm-1.1', { generator: 'first_furrow' }, 10001);
    expect(base.initialRover.x).toBe(0);
    expect(base.initialRover.y).toBe(0);
    expect(base.initialRover.heading).toBe(Direction.EAST);
    expect(base.crops).toEqual([{ x: 1, y: 0 }]);

    const otherSeeds = [10002, 10003, 10004, 10005].map((seed) =>
      resolveGridWorldConfig('w1-robot-farm-1.1', { generator: 'first_furrow' }, seed),
    );
    const signatures = new Set(
      otherSeeds.map((c) => `${c.initialRover.x},${c.initialRover.y},${c.initialRover.heading}`),
    );
    expect(signatures.size).toBeGreaterThanOrEqual(3);
  });

  it('satisfies bit-identical determinism and grid validity across all 12 procedural generators (fast-check)', () => {
    for (const generator of ALL_PROCEDURAL_GENERATORS) {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 1_000_000 }), (seed) => {
          const cfgA = resolveGridWorldConfig('w1-robot-farm-test', { generator }, seed);
          const cfgB = resolveGridWorldConfig('w1-robot-farm-test', { generator }, seed);

          // Exact structural determinism
          expect(cfgA).toEqual(cfgB);

          // Valid rover spawn inside bounds and not on a hazard
          expect(cfgA.initialRover.x).toBeGreaterThanOrEqual(0);
          expect(cfgA.initialRover.x).toBeLessThan(cfgA.width);
          expect(cfgA.initialRover.y).toBeGreaterThanOrEqual(0);
          expect(cfgA.initialRover.y).toBeLessThan(cfgA.height);
          expect(cfgA.crops.length).toBeGreaterThan(0);

          // Build simulation and verify rover spawn is safe and crops are placed
          const sim = new RobotFarmSimulation(cfgA);
          const state = sim.getGridWorldState();
          const spawnCell = state.grid[state.rover.y]?.[state.rover.x];
          expect(spawnCell).not.toBe(CellType.ROCK);
          expect(spawnCell).not.toBe(CellType.RAVINE);
          expect(state.totalCropsInitial).toBe(cfgA.crops.length);

          // Hash determinism across two fresh instances
          const sim2 = new RobotFarmSimulation(cfgB);
          expect(sim.getStateHashHex()).toBe(sim2.getStateHashHex());
        }),
        { numRuns: 20 },
      );
    }
  });
});
