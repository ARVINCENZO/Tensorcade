import { describe, expect, it } from 'vitest';
import {
  BaseSimulationEngine,
  FIXED_DELTA_MS,
  TickAccumulator,
} from './core-loop.js';
import type { DiscreteAction, SimulationOutcome } from './types.js';

interface TestCounterState {
  counter: number;
  tags: string[];
}

interface TestCounterActionParams {
  incrementBy?: number;
  addTag?: string;
  triggerWin?: boolean;
}

class TestCounterEngine extends BaseSimulationEngine<
  TestCounterState,
  TestCounterActionParams
> {
  protected initWorldState(seed: number): TestCounterState {
    return {
      counter: seed % 100,
      tags: ['init'],
    };
  }

  protected advanceTick(
    actions: ReadonlyArray<DiscreteAction<TestCounterActionParams>>,
  ): void {
    // Default tick behavior
    this.state.counter += 1;

    // Process actions
    for (const a of actions) {
      if (a.params.incrementBy !== undefined) {
        this.state.counter += a.params.incrementBy;
      }
      if (a.params.addTag !== undefined) {
        this.state.tags.push(a.params.addTag);
      }
    }
  }

  protected packBinaryState(): Uint8Array {
    const buf = new Uint8Array(8);
    const view = new DataView(buf.buffer);
    view.setInt32(0, this.state.counter, true); // Little-Endian
    view.setInt32(4, this.state.tags.length, true);
    return buf;
  }

  protected cloneState(state: TestCounterState): TestCounterState {
    return {
      counter: state.counter,
      tags: [...state.tags],
    };
  }

  protected evaluateOutcome(): SimulationOutcome {
    if (this.state.tags.includes('win')) {
      return {
        status: 'WON',
        terminalTick: this.currentTick,
        terminalHash: this.getStateHashHex(),
        starsAwarded: 3,
        metrics: { finalCounter: this.state.counter },
      };
    }
    return {
      status: 'RUNNING',
      terminalTick: 0,
      terminalHash: this.getStateHashHex(),
      starsAwarded: 0,
      metrics: { currentCounter: this.state.counter },
    };
  }

  public getRawState(): TestCounterState {
    return this.state;
  }
}

describe('BaseSimulationEngine Core Loop & Snapshot Protocol', () => {
  it('initializes at tick 0 with initial state hash and running status', () => {
    const engine = new TestCounterEngine({
      levelId: 'test-counter-1.1',
      maxTicks: 100,
      seed: 42,
    });

    expect(engine.currentTick).toBe(0);
    expect(engine.isTerminal()).toBe(false);
    expect(engine.getOutcome().status).toBe('RUNNING');
    expect(engine.getStateHashHex()).toHaveLength(16);
    expect(engine.getRawState().counter).toBe(42);
  });

  it('advances ticks sequentially and updates cumulative state hash', () => {
    const engine = new TestCounterEngine({
      levelId: 'test-counter-1.1',
      maxTicks: 10,
      seed: 104729,
    });

    const h0 = engine.getStateHashHex();
    engine.step();
    expect(engine.currentTick).toBe(1);
    expect(engine.getRawState().counter).toBe(30); // 104729 % 100 = 29, + 1 = 30
    const h1 = engine.getStateHashHex();
    expect(h1).not.toBe(h0);

    engine.step();
    expect(engine.currentTick).toBe(2);
    expect(engine.getRawState().counter).toBe(31);
    const h2 = engine.getStateHashHex();
    expect(h2).not.toBe(h1);
  });

  it('guarantees deep isolation of snapshots', () => {
    const engine = new TestCounterEngine({
      levelId: 'test-counter-1.1',
      maxTicks: 100,
      seed: 123,
    });

    engine.step([{ tick: 1, type: 'TAG', params: { addTag: 'first' } }]);
    const snapshot = engine.getSnapshot();

    // Advance and mutate engine state
    engine.step([{ tick: 2, type: 'TAG', params: { addTag: 'second', incrementBy: 10 } }]);

    // Snapshot state must NOT have been mutated
    expect(snapshot.tick).toBe(1);
    expect(snapshot.state.tags).toEqual(['init', 'first']);
    expect(engine.getRawState().tags).toEqual(['init', 'first', 'second']);
  });

  it('restores snapshot bit-for-bit and reproduces future state hashes identically', () => {
    const engine = new TestCounterEngine({
      levelId: 'test-counter-1.1',
      maxTicks: 100,
      seed: 777,
    });

    // Advance 5 ticks
    for (let i = 0; i < 5; i++) {
      engine.step();
    }
    const snapshotAt5 = engine.getSnapshot();

    // Advance 5 more ticks with actions
    const futureActions: DiscreteAction<TestCounterActionParams>[] = [
      { tick: 7, type: 'INC', params: { incrementBy: 5 } },
    ];

    engine.step(); // tick 6
    engine.step(futureActions); // tick 7
    engine.step(); // tick 8
    engine.step(); // tick 9
    engine.step(); // tick 10

    const terminalHashRun1 = engine.getStateHashHex();
    const counterRun1 = engine.getRawState().counter;

    // Restore to tick 5
    engine.restoreSnapshot(snapshotAt5);
    expect(engine.currentTick).toBe(5);
    expect(engine.getStateHashHex()).toBe(snapshotAt5.stateHashHex);

    // Re-execute identical steps 6 to 10
    engine.step(); // tick 6
    engine.step(futureActions); // tick 7
    engine.step(); // tick 8
    engine.step(); // tick 9
    engine.step(); // tick 10

    expect(engine.currentTick).toBe(10);
    expect(engine.getStateHashHex()).toBe(terminalHashRun1);
    expect(engine.getRawState().counter).toBe(counterRun1);
  });

  it('enforces maxTicks timeout when victory condition is not satisfied', () => {
    const engine = new TestCounterEngine({
      levelId: 'test-counter-1.1',
      maxTicks: 3,
      seed: 1,
    });

    engine.step(); // tick 1
    expect(engine.isTerminal()).toBe(false);
    engine.step(); // tick 2
    expect(engine.isTerminal()).toBe(false);
    engine.step(); // tick 3
    expect(engine.isTerminal()).toBe(true);

    const outcome = engine.getOutcome();
    expect(outcome.status).toBe('TIMEOUT');
    expect(outcome.starsAwarded).toBe(0);
    expect(outcome.terminalTick).toBe(3);

    // Further steps must no-op
    engine.step();
    expect(engine.currentTick).toBe(3);
  });

  it('transitions to WON when victory condition is met', () => {
    const engine = new TestCounterEngine({
      levelId: 'test-counter-1.1',
      maxTicks: 100,
      seed: 1,
    });

    engine.step([{ tick: 1, type: 'WIN', params: { addTag: 'win' } }]);
    expect(engine.isTerminal()).toBe(true);
    const outcome = engine.getOutcome();
    expect(outcome.status).toBe('WON');
    expect(outcome.starsAwarded).toBe(3);
  });

  it('resets cleanly back to tick 0', () => {
    const engine = new TestCounterEngine({
      levelId: 'test-counter-1.1',
      maxTicks: 50,
      seed: 42,
    });

    engine.step();
    engine.step();
    expect(engine.currentTick).toBe(2);

    engine.reset();
    expect(engine.currentTick).toBe(0);
    expect(engine.isTerminal()).toBe(false);
  });
});

describe('TickAccumulator (Fixed-Timestep Render Decoupling)', () => {
  it('steps onTick for every 16.666ms delta', () => {
    const acc = new TickAccumulator();
    let ticks = 0;

    // Feed 33.333ms (~2 ticks)
    const alpha = acc.update(FIXED_DELTA_MS * 2.25, () => {
      ticks++;
    });

    expect(ticks).toBe(2);
    expect(alpha).toBeCloseTo(0.25, 4);
  });

  it('clamps large frame deltas to MAX_FRAME_DELTA_CLAMP_MS', () => {
    const acc = new TickAccumulator();
    let ticks = 0;

    // Simulate tab backgrounding (e.g. 5000ms freeze)
    acc.update(5000, () => {
      ticks++;
    });

    // Max clamped to 250ms -> 250 / (1000/60) = 15 ticks
    expect(ticks).toBe(15);
  });

  it('handles non-finite delta safely without corrupting accumulator (MI-01)', () => {
    const acc = new TickAccumulator();
    let ticks = 0;
    const alpha = acc.update(NaN, () => {
      ticks++;
    });
    expect(ticks).toBe(0);
    expect(alpha).toBe(0);
    expect(acc.getAccumulatorMs()).toBe(0);
  });
});
