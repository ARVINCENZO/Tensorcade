/**
 * Simulation Engine Core Types and Interfaces.
 *
 * Conforms to docs/13-engine-spec.md §2 and docs/11-lld.md §2.1:
 * - Pure TypeScript interfaces.
 * - Decoupled from rendering and host environment.
 * - Deterministic, serializable state contracts.
 */

export interface DiscreteAction<TParams = Record<string, unknown>> {
  readonly tick: number;
  readonly type: string;
  readonly params: TParams;
}

export interface EngineSnapshot<TState = unknown> {
  readonly tick: number;
  readonly stateHash: bigint;
  readonly stateHashHex: string;
  readonly prngState: number;
  readonly state: TState;
}

export type SimulationStatus = 'RUNNING' | 'WON' | 'LOST' | 'TIMEOUT';

export interface SimulationOutcome {
  readonly status: SimulationStatus;
  readonly terminalTick: number;
  readonly terminalHash: string;
  readonly starsAwarded: 0 | 1 | 2 | 3;
  readonly metrics: Record<string, number>;
  readonly message?: string;
}

export interface EngineConfig {
  readonly levelId: string;
  readonly maxTicks: number;
  readonly seed: number;
}

/**
 * Universal SimulationEngine Contract.
 */
export interface SimulationEngine<TState = unknown, TActionParams = Record<string, unknown>> {
  readonly levelId: string;
  readonly currentTick: number;
  readonly maxTicks: number;
  readonly seed: number;

  /**
   * Advances the simulation by exactly one 60 Hz tick.
   * Purely synchronous and deterministic.
   */
  step(actions?: ReadonlyArray<DiscreteAction<TActionParams>>): void;

  /**
   * Returns current 64-bit state hash as bigint.
   */
  getStateHash(): bigint;

  /**
   * Returns current 16-character hex state hash.
   */
  getStateHashHex(): string;

  /**
   * Checks whether the level has reached a terminal outcome.
   */
  isTerminal(): boolean;

  /**
   * Retrieves the current terminal outcome.
   */
  getOutcome(): SimulationOutcome;

  /**
   * Captures an isolated deep state snapshot.
   */
  getSnapshot(): EngineSnapshot<TState>;

  /**
   * Restores simulation state bit-for-bit to a previous snapshot.
   */
  restoreSnapshot(snapshot: EngineSnapshot<TState>): void;

  /**
   * Resets the simulation to tick 0 with an optional new seed.
   */
  reset(newSeed?: number): void;
}
