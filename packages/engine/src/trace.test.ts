import { describe, expect, it } from 'vitest';
import { BaseSimulationEngine } from './core-loop.js';
import {
  ActionTraceRecorder,
  ActionTraceReplayer,
  ActionTraceSchema,
  DiscreteActionSchema,
  TraceDivergenceError,
  TraceTimeoutError,
  TraceValidationError,
} from './trace.js';
import type { DiscreteAction, SimulationOutcome } from './types.js';

interface SimpleState {
  val: number;
}

interface SimpleParams {
  add?: number;
}

class SimpleTestEngine extends BaseSimulationEngine<SimpleState, SimpleParams> {
  protected initWorldState(seed: number): SimpleState {
    return { val: seed };
  }

  protected advanceTick(actions: ReadonlyArray<DiscreteAction<SimpleParams>>): void {
    this.state.val += 1;
    for (const a of actions) {
      if (a.params.add !== undefined) {
        this.state.val += a.params.add;
      }
    }
  }

  protected packBinaryState(): Uint8Array {
    const buf = new Uint8Array(4);
    new DataView(buf.buffer).setInt32(0, this.state.val, true);
    return buf;
  }

  protected cloneState(state: SimpleState): SimpleState {
    return { val: state.val };
  }

  protected evaluateOutcome(): SimulationOutcome {
    return {
      status: 'RUNNING',
      terminalTick: 0,
      terminalHash: this.getStateHashHex(),
      starsAwarded: 0,
      metrics: { val: this.state.val },
    };
  }
}

describe('Action Trace Schema, Recorder, and Replayer (packages/engine/trace)', () => {
  describe('ActionTraceSchema Validation', () => {
    it('accepts valid action trace', () => {
      const trace = {
        version: '1.0.0',
        levelId: 'w1-farm-1.1',
        mode: 'hacker',
        seed: 42,
        totalTicks: 5,
        actions: [
          { tick: 1, type: 'STEP', params: { add: 2 } },
          { tick: 3, type: 'STEP', params: { add: 5 } },
        ],
        clientTerminalHash: '0123456789abcdef',
      };
      const parsed = ActionTraceSchema.parse(trace);
      expect(parsed.levelId).toBe('w1-farm-1.1');
      expect(parsed.actions).toHaveLength(2);
    });

    it('rejects invalid clientTerminalHash (not 16-hex)', () => {
      const invalid = {
        levelId: 'w1-farm-1.1',
        mode: 'explorer',
        seed: 42,
        totalTicks: 5,
        actions: [],
        clientTerminalHash: 'too-short',
      };
      expect(() => ActionTraceSchema.parse(invalid)).toThrowError();
    });

    it('rejects non-monotonic action ticks in ActionTraceReplayer.validateTrace', () => {
      const trace = {
        levelId: 'w1-farm-1.1',
        mode: 'builder' as const,
        seed: 42,
        totalTicks: 10,
        actions: [
          { tick: 5, type: 'ACT', params: {} },
          { tick: 2, type: 'ACT', params: {} },
        ],
        clientTerminalHash: '0123456789abcdef',
      };
      expect(() => ActionTraceReplayer.validateTrace(trace)).toThrowError(TraceValidationError);
    });

    it('rejects action at tick 0 in DiscreteActionSchema (MA-01)', () => {
      const invalid = { tick: 0, type: 'HARVEST', params: {} };
      expect(() => DiscreteActionSchema.parse(invalid)).toThrowError();
    });

    it('rejects action with tick > totalTicks in ActionTraceReplayer.validateTrace (MA-01)', () => {
      const trace = {
        version: '1.0.0' as const,
        levelId: 'w1-farm-1.1',
        mode: 'builder' as const,
        seed: 42,
        totalTicks: 5,
        actions: [
          { tick: 2, type: 'ACT', params: {} },
          { tick: 8, type: 'ACT', params: {} },
        ],
        clientTerminalHash: '0123456789abcdef',
      };
      expect(() => ActionTraceReplayer.validateTrace(trace)).toThrowError(TraceValidationError);
      expect(() => ActionTraceReplayer.validateTrace(trace)).toThrowError(
        /exceeds trace totalTicks/,
      );
    });

    it('rejects equal adjacent ticks in ActionTraceReplayer.validateTrace (MA-02)', () => {
      const trace = {
        levelId: 'w1-farm-1.1',
        mode: 'builder' as const,
        seed: 42,
        totalTicks: 10,
        actions: [
          { tick: 2, type: 'ACT', params: {} },
          { tick: 2, type: 'ACT', params: {} },
        ],
        clientTerminalHash: '0123456789abcdef',
      };
      expect(() => ActionTraceReplayer.validateTrace(trace)).toThrowError(TraceValidationError);
    });
  });

  describe('ActionTraceRecorder', () => {
    it('rejects tick < 1 and non-integer tick in recordAction (MI-02)', () => {
      const recorder = new ActionTraceRecorder('w1-farm-1.1', 42);
      expect(() => recorder.recordAction(0, 'A')).toThrowError(TraceValidationError);
      expect(() => recorder.recordAction(-1, 'A')).toThrowError(TraceValidationError);
      expect(() => recorder.recordAction(1.5, 'A')).toThrowError(TraceValidationError);
    });

    it('records actions and exports valid trace and canonical JSON', () => {
      const recorder = new ActionTraceRecorder('w1-farm-1.1', 104729);
      recorder.recordAction(1, 'HARVEST', { cropId: 1 });
      recorder.recordAction(2, 'MOVE', { dir: 'north' });

      expect(recorder.getActionCount()).toBe(2);
      const trace = recorder.exportTrace('hacker', 5, '0123456789abcdef');
      expect(trace.levelId).toBe('w1-farm-1.1');
      expect(trace.seed).toBe(104729);
      expect(trace.actions).toHaveLength(2);

      const json = recorder.exportCanonicalJson('hacker', 5, '0123456789abcdef');
      expect(json).toContain('"cropId":1');
      expect(json).toContain('"levelId":"w1-farm-1.1"');
    });

    it('throws error when recording non-monotonic ticks', () => {
      const recorder = new ActionTraceRecorder('w1-farm-1.1', 42);
      recorder.recordAction(5, 'A');
      expect(() => recorder.recordAction(3, 'B')).toThrowError(/Non-monotonic/);
    });
  });

  describe('ActionTraceReplayer (Live vs Replay Determinism)', () => {
    it('replays a live execution trace and reproduces identical terminal state hash', () => {
      const engine = new SimpleTestEngine({
        levelId: 'simple-1.1',
        maxTicks: 100,
        seed: 555,
      });

      const recorder = new ActionTraceRecorder('simple-1.1', 555);

      // Execute 5 live steps
      for (let t = 1; t <= 5; t++) {
        const action = t === 3 ? [{ tick: 3, type: 'BOOST', params: { add: 10 } }] : [];
        if (action.length > 0) {
          recorder.recordAction(3, 'BOOST', { add: 10 });
        }
        engine.step(action);
      }

      const liveTerminalHash = engine.getStateHashHex();
      const trace = recorder.exportTrace('hacker', 5, liveTerminalHash);

      // Replay in a fresh engine
      const replayEngine = new SimpleTestEngine({
        levelId: 'simple-1.1',
        maxTicks: 100,
        seed: 555,
      });

      const result = ActionTraceReplayer.replay(replayEngine, trace);
      expect(result.verified).toBe(true);
      expect(result.serverTerminalHash).toBe(liveTerminalHash);
      expect(result.clientTerminalHash).toBe(liveTerminalHash);
      expect(result.error).toBeUndefined();
    });

    it('replay strictly validates schema even when clientTerminalHash is present (BL-01)', () => {
      const engine = new SimpleTestEngine({
        levelId: 'simple-1.1',
        maxTicks: 100,
        seed: 555,
      });
      const malformedClientPayload = {
        levelId: 'simple-1.1',
        mode: 'explorer',
        seed: 555,
        totalTicks: 10,
        actions: [{ tick: -5, type: 'BAD', params: {} }], // invalid negative tick
        clientTerminalHash: '0123456789abcdef',
      };
      expect(() => ActionTraceReplayer.replay(engine, malformedClientPayload)).toThrowError(
        TraceValidationError,
      );
    });

    it('detects state hash divergence when clientTerminalHash is spoofed', () => {
      const engine = new SimpleTestEngine({
        levelId: 'simple-1.1',
        maxTicks: 50,
        seed: 42,
      });

      const fakeTrace = {
        version: '1.0.0' as const,
        levelId: 'simple-1.1',
        mode: 'hacker' as const,
        seed: 42,
        totalTicks: 5,
        actions: [],
        clientTerminalHash: 'ffffffffffffffff', // Spoofed hash
      };

      const result = ActionTraceReplayer.replay(engine, fakeTrace);
      expect(result.verified).toBe(false);
      expect(result.error).toContain('State hash divergence');

      // Throws if throwOnDivergence option enabled
      expect(() =>
        ActionTraceReplayer.replay(engine, fakeTrace, { throwOnDivergence: true }),
      ).toThrowError(TraceDivergenceError);
    });

    it('rejects trace when seed mismatches engine seed', () => {
      const engine = new SimpleTestEngine({
        levelId: 'simple-1.1',
        maxTicks: 50,
        seed: 100,
      });

      const trace = {
        version: '1.0.0' as const,
        levelId: 'simple-1.1',
        mode: 'hacker' as const,
        seed: 200, // Different seed
        totalTicks: 5,
        actions: [],
        clientTerminalHash: '0123456789abcdef',
      };

      expect(() => ActionTraceReplayer.replay(engine, trace)).toThrowError(TraceValidationError);
    });

    it('rejects trace when totalTicks exceeds engine maxTicks', () => {
      const engine = new SimpleTestEngine({
        levelId: 'simple-1.1',
        maxTicks: 10,
        seed: 42,
      });

      const trace = {
        version: '1.0.0' as const,
        levelId: 'simple-1.1',
        mode: 'hacker' as const,
        seed: 42,
        totalTicks: 15, // Exceeds maxTicks 10
        actions: [],
        clientTerminalHash: '0123456789abcdef',
      };

      expect(() => ActionTraceReplayer.replay(engine, trace)).toThrowError(TraceTimeoutError);
    });
  });
});
