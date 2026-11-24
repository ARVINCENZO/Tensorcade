/**
 * Stress and Throughput Benchmark Suite for Simulation Engine.
 *
 * Conforms to:
 * - docs/13-engine-spec.md §1 & §4 (Determinism and performance budgets)
 * - docs/15-verification-protocol.md §5 (Throughput budget: < 35 ms per 1,800 ticks, > 50k ticks/sec)
 *
 * Verifies:
 * 1. 10,000-tick action trace replayed identically with zero divergence.
 * 2. 100 distinct seeds replayed identically with zero divergence.
 * 3. Real measured tick throughput benchmark for docs/benchmarks/engine.md.
 */

import { describe, expect, it } from 'vitest';
import { RobotFarmSimulation } from './modules/grid-world/grid-world.js';
import { Direction, type GridWorldConfig, type RobotActionType } from './modules/grid-world/types.js';
import { ActionTraceRecorder, ActionTraceReplayer } from './trace.js';

describe('Engine Stress and Benchmark Suite (packages/engine/stress)', () => {
  const stressConfig: GridWorldConfig = {
    levelId: 'w1-stress-bench',
    maxTicks: 20000,
    seed: 1337,
    width: 6,
    height: 6,
    initialRover: {
      x: 0,
      y: 0,
      heading: Direction.EAST,
      energy: 50000,
    },
    crops: [{ x: 5, y: 5 }],
    rocks: [],
    ravines: [],
    star2TickThreshold: 5000,
  };

  it('replays a 10,000-tick action trace with bit-for-bit identical terminal hash', { timeout: 60000 }, () => {
    const sim = new RobotFarmSimulation(stressConfig);
    const recorder = new ActionTraceRecorder(stressConfig.levelId, stressConfig.seed);

    // Run 10,000 ticks alternating turning and waiting inside a safe area
    const actionPattern: RobotActionType[] = [
      'TURN_RIGHT',
      'WAIT',
      'TURN_LEFT',
      'WAIT',
    ];

    for (let tick = 1; tick <= 10000; tick++) {
      const type = actionPattern[tick % actionPattern.length] ?? 'WAIT';
      const action = { tick, type, params: { type } };
      recorder.recordAction(action.tick, action.type, action.params);
      sim.step([action]);
    }

    expect(sim.currentTick).toBe(10000);
    const liveTerminalHash = sim.getStateHashHex();

    const trace = recorder.exportTrace('explorer', sim.currentTick, liveTerminalHash);

    // Replay trace on fresh engine
    const replaySim = new RobotFarmSimulation(stressConfig);
    const replayResult = ActionTraceReplayer.replay(replaySim, trace);

    expect(replayResult.verified).toBe(true);
    expect(replayResult.serverTerminalHash).toBe(liveTerminalHash.toLowerCase());
    expect(replayResult.totalTicks).toBe(10000);
  });

  it('replays identical traces across 100 distinct seeds with zero divergence', { timeout: 60000 }, () => {
    const actionTypes: RobotActionType[] = ['MOVE_FORWARD', 'TURN_RIGHT', 'MOVE_FORWARD', 'TURN_LEFT'];

    for (let seed = 1; seed <= 100; seed++) {
      const config: GridWorldConfig = {
        ...stressConfig,
        levelId: `w1-multi-seed-${seed}`,
        seed,
        maxTicks: 100,
      };

      const sim = new RobotFarmSimulation(config);
      const recorder = new ActionTraceRecorder(config.levelId, seed);

      for (let tick = 1; tick <= 50; tick++) {
        if (sim.isTerminal()) break;
        const type = actionTypes[tick % actionTypes.length] ?? 'WAIT';
        const action = { tick, type, params: { type } };
        recorder.recordAction(tick, type, action.params);
        sim.step([action]);
      }

      const trace = recorder.exportTrace('builder', sim.currentTick, sim.getStateHashHex());
      const replaySim = new RobotFarmSimulation(config);
      const replayResult = ActionTraceReplayer.replay(replaySim, trace);

      expect(replayResult.verified).toBe(true);
      expect(replayResult.serverTerminalHash).toBe(sim.getStateHashHex().toLowerCase());
    }
  });

  it('measures tick throughput benchmark and verifies verification latency budget', { timeout: 60000 }, () => {
    const sim = new RobotFarmSimulation({
      ...stressConfig,
      maxTicks: 100000,
    });

    const totalTicksToMeasure = 50000;
    const startMs = performance.now();

    for (let tick = 1; tick <= totalTicksToMeasure; tick++) {
      sim.step([{ tick, type: 'WAIT', params: { type: 'WAIT' } }]);
    }

    const elapsedMs = performance.now() - startMs;
    const ticksPerSecond = Math.round((totalTicksToMeasure / (elapsedMs / 1000)));
    const latencyFor1800TicksMs = Number(((1800 / ticksPerSecond) * 1000).toFixed(2));

    // Console output for logging
    console.log(
      `[BENCHMARK] ${totalTicksToMeasure} ticks in ${elapsedMs.toFixed(2)} ms: ` +
        `${ticksPerSecond.toLocaleString()} ticks/sec, ` +
        `1,800 ticks latency: ${latencyFor1800TicksMs} ms (budget < 35 ms)`,
    );

    // Verify throughput budget: must exceed 50k ticks/sec and 1,800 ticks latency < 35 ms
    // Under coverage instrumentation (V8), tick throughput is lower due to AST counters
    const isCoverage = Boolean(process.env.NODE_V8_COVERAGE || process.env.VITEST_COVERAGE);
    const minTicks = isCoverage ? 5000 : 50000;
    expect(ticksPerSecond).toBeGreaterThan(minTicks);
    if (!isCoverage) {
      expect(latencyFor1800TicksMs).toBeLessThan(35);
    }
  });
});
