import { describe, expect, it } from 'vitest';
import { ActionTraceRecorder, ActionTraceReplayer } from '../../trace.js';
import { RobotFarmSimulation } from './grid-world.js';
import { Direction, type GridWorldConfig } from './types.js';

describe('RobotFarmSimulation Grid-World Module (packages/engine/grid-world)', () => {
  const basicConfig: GridWorldConfig = {
    levelId: 'w1-robot-farm-1.1',
    maxTicks: 50,
    seed: 104729,
    width: 5,
    height: 5,
    initialRover: {
      x: 0,
      y: 0,
      heading: Direction.EAST,
      energy: 20,
    },
    crops: [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ],
    rocks: [{ x: 3, y: 0 }],
    ravines: [{ x: 0, y: 1 }],
    star2TickThreshold: 10,
  };

  it('initializes grid, rover, and placed crops properly', () => {
    const sim = new RobotFarmSimulation(basicConfig);
    const state = sim.getGridWorldState();

    expect(state.rover.x).toBe(0);
    expect(state.rover.y).toBe(0);
    expect(state.rover.heading).toBe(Direction.EAST);
    expect(state.rover.energy).toBe(20);
    expect(state.cropsHarvested).toBe(0);
    expect(state.totalCropsInitial).toBe(2);
  });

  it('moves rover forward, harvests crops, and achieves 3-star victory', () => {
    const sim = new RobotFarmSimulation(basicConfig);

    // Tick 1: Move East to (1, 0)
    sim.step([{ tick: 1, type: 'MOVE_FORWARD', params: { type: 'MOVE_FORWARD' } }]);
    expect(sim.getGridWorldState().rover.x).toBe(1);
    expect(sim.getGridWorldState().rover.y).toBe(0);

    // Tick 2: Harvest crop at (1, 0)
    sim.step([{ tick: 2, type: 'HARVEST', params: { type: 'HARVEST' } }]);
    expect(sim.getGridWorldState().cropsHarvested).toBe(1);
    expect(sim.getGridWorldState().rover.inventory).toBe(1);

    // Tick 3: Move East to (2, 0)
    sim.step([{ tick: 3, type: 'MOVE_FORWARD', params: { type: 'MOVE_FORWARD' } }]);
    expect(sim.getGridWorldState().rover.x).toBe(2);

    // Tick 4: Harvest crop at (2, 0)
    sim.step([{ tick: 4, type: 'HARVEST', params: { type: 'HARVEST' } }]);
    expect(sim.getGridWorldState().cropsHarvested).toBe(2);

    // Outcome check
    expect(sim.isTerminal()).toBe(true);
    const outcome = sim.getOutcome();
    expect(outcome.status).toBe('WON');
    expect(outcome.starsAwarded).toBe(3); // Completed under 10 ticks with > 5 energy
    expect(outcome.terminalTick).toBe(4);
  });

  it('terminates with defeat when rover drives into a rock obstacle', () => {
    const sim = new RobotFarmSimulation(basicConfig);

    // Drive forward 3 times: (0,0) -> (1,0) -> (2,0) -> (3,0 has rock)
    sim.step([{ tick: 1, type: 'MOVE_FORWARD', params: { type: 'MOVE_FORWARD' } }]);
    sim.step([{ tick: 2, type: 'MOVE_FORWARD', params: { type: 'MOVE_FORWARD' } }]);
    sim.step([{ tick: 3, type: 'MOVE_FORWARD', params: { type: 'MOVE_FORWARD' } }]);

    expect(sim.isTerminal()).toBe(true);
    const outcome = sim.getOutcome();
    expect(outcome.status).toBe('LOST');
    expect(outcome.message).toBe('COLLIDED_WITH_ROCK');
    expect(outcome.starsAwarded).toBe(0);
  });

  it('terminates with defeat when rover drives into a ravine hazard', () => {
    const sim = new RobotFarmSimulation(basicConfig);

    // Turn right to face SOUTH (0, 1), then drive forward into ravine at (0, 1)
    sim.step([{ tick: 1, type: 'TURN_RIGHT', params: { type: 'TURN_RIGHT' } }]);
    expect(sim.getGridWorldState().rover.heading).toBe(Direction.SOUTH);

    sim.step([{ tick: 2, type: 'MOVE_FORWARD', params: { type: 'MOVE_FORWARD' } }]);

    expect(sim.isTerminal()).toBe(true);
    const outcome = sim.getOutcome();
    expect(outcome.status).toBe('LOST');
    expect(outcome.message).toBe('CRASHED_INTO_RAVINE');
  });

  it('terminates with defeat when driving out of grid bounds', () => {
    const sim = new RobotFarmSimulation(basicConfig);

    // Turn left to face NORTH (towards y = -1) and move forward
    sim.step([{ tick: 1, type: 'TURN_LEFT', params: { type: 'TURN_LEFT' } }]);
    expect(sim.getGridWorldState().rover.heading).toBe(Direction.NORTH);
    sim.step([{ tick: 2, type: 'MOVE_FORWARD', params: { type: 'MOVE_FORWARD' } }]);

    expect(sim.isTerminal()).toBe(true);
    const outcome = sim.getOutcome();
    expect(outcome.status).toBe('LOST');
    expect(outcome.message).toBe('OUT_OF_BOUNDS_COLLISION');
  });

  it('terminates with defeat when energy depletes before harvesting all crops', () => {
    const lowEnergyConfig: GridWorldConfig = {
      ...basicConfig,
      initialRover: {
        ...basicConfig.initialRover,
        energy: 1, // Only 1 energy, but needs 4 steps to win
      },
    };

    const sim = new RobotFarmSimulation(lowEnergyConfig);
    sim.step([{ tick: 1, type: 'MOVE_FORWARD', params: { type: 'MOVE_FORWARD' } }]);

    expect(sim.isTerminal()).toBe(true);
    const outcome = sim.getOutcome();
    expect(outcome.status).toBe('LOST');
    expect(outcome.message).toBe('ENERGY_DEPLETED');
  });

  it('does not trigger instant win if level has zero crops (MI-02)', () => {
    const zeroCropsConfig: GridWorldConfig = {
      ...basicConfig,
      crops: [],
    };
    const sim = new RobotFarmSimulation(zeroCropsConfig);
    expect(sim.isTerminal()).toBe(false);
    expect(sim.getOutcome().status).toBe('RUNNING');
  });

  it('crashes with MULTIPLE_ACTIONS_PER_TICK if multiple actions are submitted in one tick (MA-02)', () => {
    const sim = new RobotFarmSimulation(basicConfig);
    sim.step([
      { tick: 1, type: 'MOVE_FORWARD', params: { type: 'MOVE_FORWARD' } },
      { tick: 1, type: 'HARVEST', params: { type: 'HARVEST' } },
    ]);
    expect(sim.isTerminal()).toBe(true);
    expect(sim.getOutcome().status).toBe('LOST');
    expect(sim.getOutcome().message).toBe('MULTIPLE_ACTIONS_PER_TICK');
  });

  it('records live Robot Farm action trace and replays identically', () => {
    const sim = new RobotFarmSimulation(basicConfig);
    const recorder = new ActionTraceRecorder(basicConfig.levelId, basicConfig.seed);

    // Step 1: Move East
    recorder.recordAction(1, 'MOVE_FORWARD', { type: 'MOVE_FORWARD' });
    sim.step([{ tick: 1, type: 'MOVE_FORWARD', params: { type: 'MOVE_FORWARD' } }]);

    // Step 2: Harvest
    recorder.recordAction(2, 'HARVEST', { type: 'HARVEST' });
    sim.step([{ tick: 2, type: 'HARVEST', params: { type: 'HARVEST' } }]);

    // Step 3: Move East
    recorder.recordAction(3, 'MOVE_FORWARD', { type: 'MOVE_FORWARD' });
    sim.step([{ tick: 3, type: 'MOVE_FORWARD', params: { type: 'MOVE_FORWARD' } }]);

    // Step 4: Harvest
    recorder.recordAction(4, 'HARVEST', { type: 'HARVEST' });
    sim.step([{ tick: 4, type: 'HARVEST', params: { type: 'HARVEST' } }]);

    const liveTerminalHash = sim.getStateHashHex();
    const trace = recorder.exportTrace('hacker', sim.currentTick, liveTerminalHash);

    // Replay in fresh headless engine
    const replaySim = new RobotFarmSimulation(basicConfig);
    const result = ActionTraceReplayer.replay(replaySim, trace);

    expect(result.verified).toBe(true);
    expect(result.serverTerminalHash).toBe(liveTerminalHash);
    expect(result.outcome.status).toBe('WON');
    expect(result.outcome.starsAwarded).toBe(3);
  });

  it('recharges energy to maxEnergy on BASE tiles and penalizes off-base RECHARGE', () => {
    const baseConfig: GridWorldConfig = {
      ...basicConfig,
      initialRover: {
        x: 0,
        y: 0,
        heading: Direction.EAST,
        energy: 5,
        maxEnergy: 12,
      },
      bases: [{ x: 1, y: 0 }],
      crops: [{ x: 2, y: 0 }],
    };

    const sim = new RobotFarmSimulation(baseConfig);
    expect(sim.isOnBase()).toBe(false);
    expect(sim.isFrontClear()).toBe(true);
    expect(sim.canHarvest()).toBe(false);
    expect(sim.hasEnergy()).toBe(true);
    expect(sim.isFieldCleared()).toBe(false);

    // Off-base RECHARGE consumes 1 energy as penalty
    sim.step([{ tick: 1, type: 'RECHARGE', params: { type: 'RECHARGE' } }]);
    expect(sim.getGridWorldState().rover.energy).toBe(4);

    // Move onto BASE tile at (1, 0)
    sim.step([{ tick: 2, type: 'MOVE_FORWARD', params: { type: 'MOVE_FORWARD' } }]);
    expect(sim.isOnBase()).toBe(true);
    expect(sim.getGridWorldState().rover.energy).toBe(3);

    // Recharge on BASE restores maxEnergy (12)
    sim.step([{ tick: 3, type: 'RECHARGE', params: { type: 'RECHARGE' } }]);
    expect(sim.getGridWorldState().rover.energy).toBe(12);

    // Move onto CROP at (2, 0), inspect sensors, and harvest
    sim.step([{ tick: 4, type: 'MOVE_FORWARD', params: { type: 'MOVE_FORWARD' } }]);
    expect(sim.canHarvest()).toBe(true);
    expect(sim.isRockAhead()).toBe(true);
    expect(sim.isFrontClear()).toBe(false);
    expect(sim.isRavineAhead()).toBe(false);

    sim.step([{ tick: 5, type: 'HARVEST', params: { type: 'HARVEST' } }]);
    expect(sim.isFieldCleared()).toBe(true);
    expect(sim.getOutcome().status).toBe('WON');
  });

  it('detects ravines and out-of-bounds edges via isRavineAhead sensor', () => {
    const sim = new RobotFarmSimulation(basicConfig);
    // Turn left to face NORTH (out of bounds at y = -1)
    sim.step([{ tick: 1, type: 'TURN_LEFT', params: { type: 'TURN_LEFT' } }]);
    expect(sim.isFrontClear()).toBe(false);
    expect(sim.isRockAhead()).toBe(false);
    expect(sim.isRavineAhead()).toBe(true);

    // Turn around to face SOUTH (ravine at (0, 1))
    sim.step([{ tick: 2, type: 'TURN_LEFT', params: { type: 'TURN_LEFT' } }]);
    sim.step([{ tick: 3, type: 'TURN_LEFT', params: { type: 'TURN_LEFT' } }]);
    expect(sim.isFrontClear()).toBe(false);
    expect(sim.isRavineAhead()).toBe(true);
  });
});
