/**
 * Property-Based Verification Test Suite for Simulation Engine.
 *
 * Uses fast-check to rigorously verify the determinism laws from:
 * - docs/13-engine-spec.md §1 & §4
 * - docs/00-project-rules.md (RULE 01: Simulation Engine determinism is sacred)
 *
 * Laws verified:
 * 1. Determinism: Same (seed, level, action trace) produces identical terminal hash across runs.
 * 2. Snapshot / Restore Isolation: Snapshots restore state and cumulative hash with zero divergence.
 * 3. Live vs Replay Equivalence: An action trace recorded live replays to the exact same terminal hash.
 * 4. Fuzz Resilience: Arbitrary or adversarial action payloads never cause unhandled crashes.
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { RobotFarmSimulation } from './modules/grid-world/grid-world.js';
import {
  Direction,
  type GridWorldConfig,
  type RobotActionType,
} from './modules/grid-world/types.js';
import { ActionTraceRecorder, ActionTraceReplayer } from './trace.js';
import type { DiscreteAction } from './types.js';

describe('Engine Property-Based Verification (packages/engine/properties)', () => {
  const baseFarmConfig: GridWorldConfig = {
    levelId: 'w1-robot-farm-prop-test',
    maxTicks: 100,
    seed: 42,
    width: 6,
    height: 6,
    initialRover: {
      x: 1,
      y: 1,
      heading: Direction.EAST,
      energy: 50,
    },
    crops: [
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 3, y: 2 },
    ],
    rocks: [{ x: 4, y: 1 }],
    ravines: [{ x: 1, y: 3 }],
    star2TickThreshold: 20,
  };

  const actionTypeArb = fc.constantFrom<RobotActionType>(
    'MOVE_FORWARD',
    'TURN_LEFT',
    'TURN_RIGHT',
    'HARVEST',
    'WAIT',
  );

  const actionSequenceArb = fc.array(actionTypeArb, { minLength: 1, maxLength: 20 }).map((types) =>
    types.map((type, idx): DiscreteAction<{ type: RobotActionType }> => ({
      tick: idx + 1,
      type,
      params: { type },
    })),
  );

  const seedArb = fc.integer({ min: 0, max: 0x7fffffff });

  it('Property 1: Same (seed, level, action trace) always yields bit-for-bit identical state hash', () => {
    fc.assert(
      fc.property(seedArb, actionSequenceArb, (seed, actions) => {
        const config: GridWorldConfig = { ...baseFarmConfig, seed };

        const simA = new RobotFarmSimulation(config);
        const simB = new RobotFarmSimulation(config);

        for (const action of actions) {
          if (!simA.isTerminal()) {
            simA.step([action]);
          }
          if (!simB.isTerminal()) {
            simB.step([action]);
          }

          expect(simA.currentTick).toBe(simB.currentTick);
          expect(simA.getStateHashHex()).toBe(simB.getStateHashHex());
        }

        expect(simA.getOutcome().terminalHash).toBe(simB.getOutcome().terminalHash);
        expect(simA.getOutcome().status).toBe(simB.getOutcome().status);
      }),
      { numRuns: 50 },
    );
  });

  it('Property 2: Snapshot at tick M, advancing N ticks, restoring to M, and advancing produces identical state', () => {
    fc.assert(
      fc.property(
        seedArb,
        fc.integer({ min: 2, max: 8 }),
        fc.integer({ min: 1, max: 6 }),
        actionTypeArb,
        (seed, mTicks, nTicks, branchAction) => {
          const config: GridWorldConfig = { ...baseFarmConfig, seed, maxTicks: 100 };
          const sim = new RobotFarmSimulation(config);

          // Advance M ticks
          for (let t = 1; t <= mTicks && !sim.isTerminal(); t++) {
            sim.step([{ tick: t, type: 'MOVE_FORWARD', params: { type: 'MOVE_FORWARD' } }]);
          }

          const snapshotM = sim.getSnapshot();
          const hashAtM = sim.getStateHashHex();

          // Advance N ticks along Path 1
          const path1Hashes: string[] = [];
          for (let t = 1; t <= nTicks && !sim.isTerminal(); t++) {
            sim.step([
              {
                tick: snapshotM.tick + t,
                type: branchAction,
                params: { type: branchAction },
              },
            ]);
            path1Hashes.push(sim.getStateHashHex());
          }

          // Restore to Snapshot M
          sim.restoreSnapshot(snapshotM);
          expect(sim.currentTick).toBe(snapshotM.tick);
          expect(sim.getStateHashHex()).toBe(hashAtM);

          // Re-advance N ticks along identical Path
          const path2Hashes: string[] = [];
          for (let t = 1; t <= nTicks && !sim.isTerminal(); t++) {
            sim.step([
              {
                tick: snapshotM.tick + t,
                type: branchAction,
                params: { type: branchAction },
              },
            ]);
            path2Hashes.push(sim.getStateHashHex());
          }

          expect(path2Hashes).toEqual(path1Hashes);
        },
      ),
      { numRuns: 40 },
    );
  });

  it('Property 3: Live execution trace replayed via ActionTraceReplayer matches live terminal hash', () => {
    fc.assert(
      fc.property(seedArb, actionSequenceArb, (seed, actions) => {
        const config: GridWorldConfig = { ...baseFarmConfig, seed };
        const sim = new RobotFarmSimulation(config);
        const recorder = new ActionTraceRecorder(config.levelId, seed);

        for (const action of actions) {
          if (sim.isTerminal()) break;
          recorder.recordAction(action.tick, action.type, action.params);
          sim.step([action]);
        }

        const trace = recorder.exportTrace('explorer', sim.currentTick, sim.getStateHashHex());

        // Replay with fresh engine instance
        const replayEngine = new RobotFarmSimulation(config);
        const replayResult = ActionTraceReplayer.replay(replayEngine, trace);

        expect(replayResult.verified).toBe(true);
        expect(replayResult.serverTerminalHash).toBe(sim.getStateHashHex().toLowerCase());
        expect(replayResult.totalTicks).toBe(sim.currentTick);
      }),
      { numRuns: 50 },
    );
  });

  it('Property 4: Adversarial and fuzzed traces never cause unhandled crashes in engine', () => {
    // Generate chaotic action inputs: non-standard strings, negative ticks, arbitrary dictionary values
    const fuzzedActionArb = fc.record({
      tick: fc.oneof(fc.integer({ min: -100, max: 200 }), fc.constant(0)),
      type: fc.oneof(fc.string(), fc.constantFrom('UNKNOWN_ACTION', '', 'DROP_TABLE', '12345')),
      params: fc.dictionary(
        fc.string(),
        fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
      ),
    });

    const fuzzedTraceArb = fc.record({
      version: fc.constant('1.0.0' as const),
      levelId: fc.string(),
      mode: fc.constantFrom<'explorer' | 'builder' | 'hacker'>('explorer', 'builder', 'hacker'),
      seed: seedArb,
      actions: fc.array(fuzzedActionArb, { maxLength: 20 }),
      clientTerminalHash: fc.stringMatching(/^[0-9a-fA-F]{16}$/),
      totalTicks: fc.integer({ min: 0, max: 100 }),
    });

    fc.assert(
      fc.property(fuzzedTraceArb, (fuzzed) => {
        // Validation with Replayer must either cleanly fail with TraceValidationError, TraceDivergenceError, TraceTimeoutError, or complete without crashing
        try {
          const replayEngine = new RobotFarmSimulation({
            ...baseFarmConfig,
            levelId: fuzzed.levelId,
            seed: fuzzed.seed,
          });
          const result = ActionTraceReplayer.replay(replayEngine, fuzzed);
          expect(typeof result.verified).toBe('boolean');
          expect(typeof result.serverTerminalHash).toBe('string');
        } catch (err: unknown) {
          // If error is thrown, it MUST be a known typed error
          expect(err).toBeInstanceOf(Error);
          const errorName = (err as Error).name;
          expect(['TraceValidationError', 'TraceDivergenceError', 'TraceTimeoutError']).toContain(
            errorName,
          );
        }
      }),
      { numRuns: 50 },
    );
  });
});
