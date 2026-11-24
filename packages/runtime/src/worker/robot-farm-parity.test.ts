import { describe, it, expect, beforeAll } from 'vitest';
import {
  ActionTraceReplayer,
  RobotFarmSimulation,
  resolveGridWorldConfig,
} from '@tensorcade/engine';
import { PyodideWorkerCore } from './pyodide-worker-core.js';

describe('Robot Farm Python Sensor Mirror Parity (Pyodide <-> @tensorcade/engine)', () => {
  let core: PyodideWorkerCore;

  beforeAll(async () => {
    core = new PyodideWorkerCore();
    await core.initRuntime({ baseUrl: '', memoryLimitMb: 512, preloadPackages: [] });
  }, 30000);

  it('maintains 100% sensor & state parity on shifting_perimeter while loop', async () => {
    const cfg = resolveGridWorldConfig(
      'w1-robot-farm-1.8',
      { generator: 'shifting_perimeter', maxTicks: 80, star2TickThreshold: 45 },
      10801,
    );

    const code = [
      'while not is_field_cleared():',
      '    if is_front_clear():',
      '        step()',
      '    else:',
      '        turn_right()',
      '    if can_harvest():',
      '        harvest()',
      'print(get_position(), get_heading(), get_energy(), crops_remaining())',
    ].join('\n');

    const res = await core.executeCode({
      code,
      levelId: cfg.levelId,
      seed: cfg.seed,
      timeoutMs: 5000,
      mockEnv: { __gridWorld: cfg },
    });

    expect(res.success).toBe(true);
    expect(res.actionTrace).toBeDefined();

    const engine = new RobotFarmSimulation(cfg);
    const replay = ActionTraceReplayer.replay(engine, res.actionTrace!);
    const state = engine.getGridWorldState();

    expect(replay.outcome.status).toBe('WON');
    expect(state.crashed).toBe(false);
    expect(state.cropsHarvested).toBe(state.totalCropsInitial);
    expect(res.stdout).toContain(`(${state.rover.x}, ${state.rover.y})`);
    expect(res.stdout).toContain(`${state.rover.energy} 0`);
  });

  it('maintains 100% parity on battery_relay recharge base mechanics', async () => {
    const cfg = resolveGridWorldConfig(
      'w1-robot-farm-1.9',
      { generator: 'battery_relay', maxTicks: 80, star2TickThreshold: 45 },
      10901,
    );

    const code = [
      'while has_energy() and not is_field_cleared():',
      '    if is_on_base() and get_energy() < 12:',
      '        recharge()',
      '    if is_front_clear():',
      '        step()',
      '    else:',
      '        turn_right()',
      '    if can_harvest():',
      '        harvest()',
      'print(get_energy(), get_max_energy(), is_field_cleared())',
    ].join('\n');

    const res = await core.executeCode({
      code,
      levelId: cfg.levelId,
      seed: cfg.seed,
      timeoutMs: 5000,
      mockEnv: { __gridWorld: cfg },
    });

    expect(res.success).toBe(true);
    const engine = new RobotFarmSimulation(cfg);
    const replay = ActionTraceReplayer.replay(engine, res.actionTrace!);
    const state = engine.getGridWorldState();

    expect(replay.outcome.status).toBe('WON');
    expect(state.crashed).toBe(false);
    expect(res.stdout).toContain(`${state.rover.energy} ${state.rover.maxEnergy} True`);
  });

  it('maintains 100% parity on hazard_triage rock vs ravine sensors and halts cleanly on crash', async () => {
    const cfg = resolveGridWorldConfig(
      'w1-robot-farm-1.7',
      { generator: 'hazard_triage', maxTicks: 60, star2TickThreshold: 25 },
      10701,
    );

    // Correct triage passes
    const goodCode = [
      'for _ in range(get_row_length()):',
      '    if is_rock_ahead():',
      '        turn_right()',
      '    elif is_ravine_ahead():',
      '        turn_left()',
      '    else:',
      '        step()',
      '        if can_harvest():',
      '            harvest()',
    ].join('\n');

    const goodRes = await core.executeCode({
      code: goodCode,
      levelId: cfg.levelId,
      seed: cfg.seed,
      timeoutMs: 5000,
      mockEnv: { __gridWorld: cfg },
    });
    expect(goodRes.success).toBe(true);
    const goodEngine = new RobotFarmSimulation(cfg);
    expect(ActionTraceReplayer.replay(goodEngine, goodRes.actionTrace!).outcome.status).toBe('WON');

    // Naive infinite-looking loop driving into wall halts cleanly at the exact crash tick
    const crashCode = 'while not is_field_cleared():\n    step()\n';
    const crashRes = await core.executeCode({
      code: crashCode,
      levelId: cfg.levelId,
      seed: cfg.seed,
      timeoutMs: 5000,
      mockEnv: { __gridWorld: cfg },
    });
    expect(crashRes.success).toBe(true);
    expect(crashRes.actionTrace).toBeDefined();
    expect(crashRes.actionTrace!.actions.length).toBeLessThan(10);

    const crashEngine = new RobotFarmSimulation(cfg);
    const crashReplay = ActionTraceReplayer.replay(crashEngine, crashRes.actionTrace!);
    expect(crashReplay.outcome.status).toBe('LOST');
    expect(['COLLIDED_WITH_ROCK', 'CRASHED_INTO_RAVINE']).toContain(crashReplay.outcome.message);
  });

  it('exposes defensive copies of get_plot_lengths() and supports capstone_dome decomposition', async () => {
    const cfg = resolveGridWorldConfig(
      'w1-robot-farm-1.12',
      { generator: 'capstone_dome', maxTicks: 150, star2TickThreshold: 120 },
      11201,
    );

    const code = [
      'lengths = get_plot_lengths()',
      'lengths.append(999)',
      'assert len(get_plot_lengths()) == 4',
      'def harvest_lane(length):',
      '    for _ in range(length):',
      '        step()',
      '        if can_harvest():',
      '            harvest()',
      '    turn_right()',
      '    turn_right()',
      '    for _ in range(length):',
      '        step()',
      'def advance_to_next_lane():',
      '    turn_left()',
      '    step()',
      '    step()',
      '    turn_left()',
      '    if is_on_base():',
      '        recharge()',
      'real_lengths = get_plot_lengths()',
      'for i in range(len(real_lengths)):',
      '    harvest_lane(real_lengths[i])',
      '    if i < len(real_lengths) - 1:',
      '        advance_to_next_lane()',
    ].join('\n');

    const res = await core.executeCode({
      code,
      levelId: cfg.levelId,
      seed: cfg.seed,
      timeoutMs: 5000,
      mockEnv: { __gridWorld: cfg },
    });

    expect(res.success).toBe(true);
    const engine = new RobotFarmSimulation(cfg);
    const replay = ActionTraceReplayer.replay(engine, res.actionTrace!);
    expect(replay.outcome.status).toBe('WON');
    expect(replay.totalTicks).toBeLessThanOrEqual(120);
  });
});
