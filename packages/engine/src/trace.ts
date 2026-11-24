/**
 * Action Trace Recording, Validation, and Deterministic Replay.
 *
 * Conforms to docs/13-engine-spec.md §5 and docs/15-verification-protocol.md §2:
 * - Zod schema validation for discrete action traces.
 * - Monotonic tick order verification.
 * - ActionTraceRecorder for in-game execution logging.
 * - ActionTraceReplayer for headless zero-compute anti-cheat re-simulation.
 */

import { z } from 'zod';
import {
  ActionTraceSchema,
  type ActionTrace,
  DiscreteActionSchema,
  type DiscreteActionData,
  type PlayMode,
} from '@tensorcade/contracts';
import { canonicalJsonStringify } from './hash.js';
import type { DiscreteAction, SimulationEngine, SimulationOutcome } from './types.js';

export {
  ActionTraceSchema,
  type ActionTrace,
  DiscreteActionSchema,
  type DiscreteActionData,
  type PlayMode,
};

// --- Typed Trace Error Taxonomy ---

export class TraceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TraceError';
  }
}

export class TraceValidationError extends TraceError {
  constructor(message: string, public readonly zodIssues?: z.ZodIssue[]) {
    super(message);
    this.name = 'TraceValidationError';
  }
}

export class TraceDivergenceError extends TraceError {
  constructor(
    message: string,
    public readonly serverTerminalHash: string,
    public readonly clientTerminalHash: string,
  ) {
    super(message);
    this.name = 'TraceDivergenceError';
  }
}

export class TraceTimeoutError extends TraceError {
  constructor(message: string, public readonly totalTicks: number, public readonly maxTicks: number) {
    super(message);
    this.name = 'TraceTimeoutError';
  }
}

/**
 * Recorder for capturing discrete learner actions during a live simulation.
 */
export class ActionTraceRecorder {
  private readonly actions: DiscreteActionData[] = [];
  private readonly levelId: string;
  private readonly seed: number;

  constructor(levelId: string, seed: number) {
    this.levelId = levelId;
    this.seed = seed;
  }

  /**
   * Records a discrete action at the current engine tick.
   */
  public recordAction(
    tick: number,
    type: string,
    params: Record<string, number | string | boolean | null> = {},
  ): void {
    if (tick < 1 || !Number.isInteger(tick)) {
      throw new TraceValidationError(`Action tick must be an integer >= 1: received ${tick}`);
    }
    const lastAction = this.actions[this.actions.length - 1];
    if (lastAction && lastAction.tick >= tick) {
      throw new TraceError(
        `Non-monotonic action tick recorded: current tick ${tick} <= last tick ${lastAction.tick}`,
      );
    }
    this.actions.push({ tick, type, params });
  }

  /**
   * Exports the completed action trace.
   */
  public exportTrace(
    mode: PlayMode,
    totalTicks: number,
    terminalHashHex: string,
  ): ActionTrace {
    const traceData: ActionTrace = {
      version: '1.0.0',
      levelId: this.levelId,
      mode,
      seed: this.seed,
      totalTicks,
      actions: [...this.actions],
      clientTerminalHash: terminalHashHex.toLowerCase(),
    };

    return ActionTraceSchema.parse(traceData);
  }

  /**
   * Exports the trace as a canonical sorted JSON string.
   */
  public exportCanonicalJson(
    mode: PlayMode,
    totalTicks: number,
    terminalHashHex: string,
  ): string {
    return canonicalJsonStringify(this.exportTrace(mode, totalTicks, terminalHashHex));
  }

  public getActionCount(): number {
    return this.actions.length;
  }
}

export interface ReplayOptions {
  onTick?: (tick: number, currentHash: string, outcome: SimulationOutcome) => void;
  throwOnDivergence?: boolean;
}

export interface ReplayResult {
  readonly verified: boolean;
  readonly serverTerminalHash: string;
  readonly clientTerminalHash: string;
  readonly totalTicks: number;
  readonly outcome: SimulationOutcome;
  readonly error?: string | undefined;
}

/**
 * Deterministic Replayer for executing action traces against a simulation engine.
 */
export class ActionTraceReplayer {
  /**
   * Validates raw trace data against schema and verifies invariants.
   */
  public static validateTrace(rawTrace: unknown, expectedLevelId?: string): ActionTrace {
    const result = ActionTraceSchema.safeParse(rawTrace);
    if (!result.success) {
      throw new TraceValidationError(
        `Action trace validation failed: ${result.error.errors.map((e) => e.message).join('; ')}`,
        result.error.issues,
      );
    }

    const trace = result.data;
    if (expectedLevelId && trace.levelId !== expectedLevelId) {
      throw new TraceValidationError(
        `Trace levelId mismatch: expected "${expectedLevelId}", received "${trace.levelId}"`,
      );
    }

    // Verify action tick bounds and monotonic action ticks (strictly increasing)
    for (let i = 0; i < trace.actions.length; i++) {
      const action = trace.actions[i];
      if (!action) continue;

      if (action.tick > trace.totalTicks) {
        throw new TraceValidationError(
          `Action tick ${action.tick} exceeds trace totalTicks ${trace.totalTicks}`,
        );
      }

      if (i > 0) {
        const prev = trace.actions[i - 1];
        if (prev && action.tick <= prev.tick) {
          throw new TraceValidationError(
            `Non-monotonic action tick in trace at index ${i}: tick ${action.tick} <= previous ${prev.tick}`,
          );
        }
      }
    }

    return trace;
  }

  /**
   * Replays an action trace through the simulation engine and verifies terminal state hash.
   */
  public static replay<TState, TParams>(
    engine: SimulationEngine<TState, TParams>,
    trace: ActionTrace | unknown,
    options: ReplayOptions = {},
  ): ReplayResult {
    const validatedTrace = this.validateTrace(trace, engine.levelId);

    if (validatedTrace.seed !== engine.seed) {
      throw new TraceValidationError(
        `Engine seed (${engine.seed}) does not match trace seed (${validatedTrace.seed})`,
      );
    }

    if (validatedTrace.totalTicks > engine.maxTicks) {
      throw new TraceTimeoutError(
        `Trace totalTicks (${validatedTrace.totalTicks}) exceeds engine maxTicks (${engine.maxTicks})`,
        validatedTrace.totalTicks,
        engine.maxTicks,
      );
    }

    // Reset engine to tick 0
    engine.reset(validatedTrace.seed);

    // Index actions by tick for O(1) step lookup
    const actionsByTick = new Map<number, DiscreteAction<TParams>[]>();
    for (const action of validatedTrace.actions) {
      const list = actionsByTick.get(action.tick);
      const actionObj = {
        tick: action.tick,
        type: action.type,
        params: action.params as TParams,
      };
      if (list) {
        list.push(actionObj);
      } else {
        actionsByTick.set(action.tick, [actionObj]);
      }
    }

    // Replay ticks 1 through totalTicks
    for (let tick = 1; tick <= validatedTrace.totalTicks; tick++) {
      const tickActions = actionsByTick.get(tick) ?? [];
      engine.step(tickActions);

      options.onTick?.(tick, engine.getStateHashHex(), engine.getOutcome());

      if (engine.isTerminal() && tick < validatedTrace.totalTicks) {
        // Simulation terminated earlier than totalTicks
        break;
      }
    }

    const serverTerminalHash = engine.getStateHashHex().toLowerCase();
    const clientTerminalHash = validatedTrace.clientTerminalHash.toLowerCase();
    const verified = serverTerminalHash === clientTerminalHash;

    if (!verified && options.throwOnDivergence) {
      throw new TraceDivergenceError(
        `State hash divergence detected: server hash "${serverTerminalHash}" != client hash "${clientTerminalHash}"`,
        serverTerminalHash,
        clientTerminalHash,
      );
    }

    return {
      verified,
      serverTerminalHash,
      clientTerminalHash,
      totalTicks: engine.currentTick,
      outcome: engine.getOutcome(),
      error: verified
        ? undefined
        : `State hash divergence: server (${serverTerminalHash}) != client (${clientTerminalHash})`,
    };
  }
}
