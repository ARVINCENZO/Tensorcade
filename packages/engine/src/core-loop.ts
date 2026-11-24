/**
 * Deterministic Simulation Engine Core Loop & Snapshot Protocol.
 *
 * Conforms to docs/13-engine-spec.md §2 and §6:
 * - Pure TypeScript, zero DOM/Node dependencies, zero async scheduling.
 * - Integer tick tracking at fixed 60 Hz frequency.
 * - Little-Endian binary state packing and xxHash64 hash accumulation.
 * - Deep isolation snapshot / restore round-tripping.
 */

import { bigintToHex16, computeInitialStateHash, updateCumulativeStateHash } from './hash.js';
import { DeterministicPRNG } from './prng.js';
import type {
  DiscreteAction,
  EngineConfig,
  EngineSnapshot,
  SimulationEngine,
  SimulationOutcome,
} from './types.js';

export const FIXED_TIMESTEP_HZ = 60;
export const FIXED_DELTA_MS = 1000 / FIXED_TIMESTEP_HZ; // 16.6666... ms
export const MAX_FRAME_DELTA_CLAMP_MS = 250; // Prevent spiral of death on tab unfocus

/**
 * Pacing helper for decoupled render loops (docs/13-engine-spec.md §2.1).
 * Clamps large frame deltas and yields fractional alpha for silky interpolation.
 */
export class TickAccumulator {
  private accumulatorMs = 0;

  /**
   * Consumes elapsed wall-clock frame delta, steps the tick callback,
   * and returns the rendering interpolation alpha [0.0, 1.0).
   */
  public update(frameDeltaMs: number, onTick: () => void): number {
    const safeDelta = Number.isFinite(frameDeltaMs) ? frameDeltaMs : 0;
    const clampedDelta = Math.min(Math.max(safeDelta, 0), MAX_FRAME_DELTA_CLAMP_MS);
    this.accumulatorMs += clampedDelta;

    while (this.accumulatorMs >= FIXED_DELTA_MS) {
      onTick();
      this.accumulatorMs -= FIXED_DELTA_MS;
    }

    const alpha = this.accumulatorMs / FIXED_DELTA_MS;
    return Math.min(Math.max(alpha, 0.0), 1.0);
  }

  public reset(): void {
    this.accumulatorMs = 0;
  }

  public getAccumulatorMs(): number {
    return this.accumulatorMs;
  }
}

/**
 * Base abstract simulation engine providing deterministic tick stepping,
 * state hashing, and snapshot/restore mechanics.
 */
export abstract class BaseSimulationEngine<
  TState,
  TActionParams = Record<string, unknown>,
> implements SimulationEngine<TState, TActionParams> {
  public readonly levelId: string;
  public readonly maxTicks: number;
  private _seed: number;
  private _currentTick = 0;
  private _cumulativeHash: bigint;
  private hashBuf: Uint8Array | undefined;
  private hashView: DataView | undefined;
  protected prng: DeterministicPRNG;
  protected state: TState;
  protected outcome: SimulationOutcome;

  constructor(config: EngineConfig, initialState?: TState) {
    this.levelId = config.levelId;
    this.maxTicks = config.maxTicks;
    this._seed = config.seed >>> 0;
    this.prng = new DeterministicPRNG(this._seed);
    this._cumulativeHash = computeInitialStateHash(this._seed, this.levelId);
    this.state = initialState !== undefined ? initialState : this.initWorldState(this._seed);
    this.outcome = {
      status: 'RUNNING',
      terminalTick: 0,
      terminalHash: bigintToHex16(this._cumulativeHash),
      starsAwarded: 0,
      metrics: {},
    };
  }

  public get seed(): number {
    return this._seed;
  }

  public get currentTick(): number {
    return this._currentTick;
  }

  public getStateHash(): bigint {
    return this._cumulativeHash;
  }

  public getStateHashHex(): string {
    return bigintToHex16(this._cumulativeHash);
  }

  public isTerminal(): boolean {
    return this.outcome.status !== 'RUNNING';
  }

  public getOutcome(): SimulationOutcome {
    return this.outcome;
  }

  /**
   * Advances the simulation by exactly one 60 Hz tick.
   */
  public step(actions: ReadonlyArray<DiscreteAction<TActionParams>> = []): void {
    if (this.isTerminal()) {
      return;
    }

    this._currentTick++;

    // Subclass tick advancement
    this.advanceTick(actions);

    // Pack binary state in Little-Endian format and update hash
    const packed = this.packBinaryState();
    const requiredLen = 12 + packed.length;
    if (!this.hashBuf || !this.hashView || this.hashBuf.length !== requiredLen) {
      this.hashBuf = new Uint8Array(requiredLen);
      this.hashView = new DataView(this.hashBuf.buffer);
    }
    this._cumulativeHash = updateCumulativeStateHash(
      this._cumulativeHash,
      this._currentTick,
      packed,
      this.hashBuf,
      this.hashView,
    );

    // Check game-specific victory or loss conditions
    const updatedOutcome = this.evaluateOutcome();
    if (updatedOutcome.status !== 'RUNNING') {
      this.outcome = {
        ...updatedOutcome,
        terminalTick: this._currentTick,
        terminalHash: this.getStateHashHex(),
      };
      return;
    }

    // Timeout boundary enforcement
    if (this._currentTick >= this.maxTicks) {
      this.outcome = {
        status: 'TIMEOUT',
        terminalTick: this._currentTick,
        terminalHash: this.getStateHashHex(),
        starsAwarded: 0,
        metrics: updatedOutcome.metrics,
        message: `Simulation exceeded maxTicks (${this.maxTicks}) without satisfying goal conditions.`,
      };
    }
  }

  /**
   * Deeply isolated snapshot capture.
   */
  public getSnapshot(): EngineSnapshot<TState> {
    return {
      tick: this._currentTick,
      stateHash: this._cumulativeHash,
      stateHashHex: this.getStateHashHex(),
      prngState: this.prng.getState(),
      state: this.cloneState(this.state),
    };
  }

  /**
   * Restores state bit-for-bit to a captured snapshot.
   */
  public restoreSnapshot(snapshot: EngineSnapshot<TState>): void {
    this._currentTick = snapshot.tick;
    this._cumulativeHash = snapshot.stateHash;
    this.prng.setState(snapshot.prngState);
    this.state = this.cloneState(snapshot.state);

    // Re-evaluate outcome
    const reevaluated = this.evaluateOutcome();
    if (snapshot.tick >= this.maxTicks && reevaluated.status === 'RUNNING') {
      this.outcome = {
        status: 'TIMEOUT',
        terminalTick: snapshot.tick,
        terminalHash: snapshot.stateHashHex,
        starsAwarded: 0,
        metrics: reevaluated.metrics,
      };
    } else {
      this.outcome = {
        ...reevaluated,
        terminalTick: reevaluated.status === 'RUNNING' ? 0 : snapshot.tick,
        terminalHash: snapshot.stateHashHex,
      };
    }
  }

  /**
   * Resets simulation to tick 0.
   */
  public reset(newSeed?: number): void {
    if (newSeed !== undefined) {
      this._seed = newSeed >>> 0;
    }
    this._currentTick = 0;
    this.prng = new DeterministicPRNG(this._seed);
    this._cumulativeHash = computeInitialStateHash(this._seed, this.levelId);
    this.state = this.initWorldState(this._seed);
    this.outcome = {
      status: 'RUNNING',
      terminalTick: 0,
      terminalHash: bigintToHex16(this._cumulativeHash),
      starsAwarded: 0,
      metrics: {},
    };
  }

  // --- Abstract Domain Hooks ---

  /**
   * Initializes initial world state for a given seed.
   */
  protected abstract initWorldState(seed: number): TState;

  /**
   * Advances game logic for a single tick with dispatched actions.
   */
  protected abstract advanceTick(actions: ReadonlyArray<DiscreteAction<TActionParams>>): void;

  /**
   * Serializes active state into a packed binary buffer using Little-Endian order.
   */
  protected abstract packBinaryState(): Uint8Array;

  /**
   * Deep clones state object to guarantee snapshot isolation.
   */
  protected abstract cloneState(state: TState): TState;

  /**
   * Evaluates current status, victory conditions, and metrics.
   */
  protected abstract evaluateOutcome(): SimulationOutcome;
}
