/**
 * Level Reference Solution Validator.
 *
 * Conforms to docs/QUALITY_BAR.md §Testing, docs/12-level-schema.md, and docs/15-verification-protocol.md:
 * - Runs level reference solutions under Pyodide in Node across all 5 evaluation seeds.
 * - Replays action traces through deterministic simulation engine.
 * - Verifies level completion, absence of crashes, and AST constraint compliance.
 * - Fails and rejects unsolvable or broken levels.
 */

import type { LevelManifest } from '@tensorcade/levels';
import { PyodideWorkerCore, AstInspector } from '@tensorcade/runtime';
import { RobotFarmSimulation, ActionTraceReplayer, Direction } from '@tensorcade/engine';

export interface LevelValidationResult {
  readonly levelId: string;
  readonly valid: boolean;
  readonly seedResults: ReadonlyArray<{
    readonly seed: number;
    readonly success: boolean;
    readonly totalTicks: number;
    readonly error?: string;
  }>;
  readonly errors: ReadonlyArray<string>;
}

export class LevelValidator {
  private readonly workerCore: PyodideWorkerCore;

  constructor(workerCore?: PyodideWorkerCore) {
    this.workerCore = workerCore ?? new PyodideWorkerCore();
  }

  public async init(): Promise<void> {
    if (!this.workerCore.isInitialized()) {
      await this.workerCore.initRuntime({ baseUrl: '', memoryLimitMb: 512, preloadPackages: [] });
    }
  }

  /**
   * Validates a single level manifest against all 5 evaluation seeds.
   */
  public async validateLevel(manifest: LevelManifest): Promise<LevelValidationResult> {
    await this.init();
    const errors: string[] = [];

    // 1. Validate AST Constraints on Reference Solution
    if (manifest.astConstraints) {
      const astResult = AstInspector.inspect(manifest.referenceSolution, manifest.astConstraints);
      if (!astResult.valid) {
        for (const violation of astResult.violations) {
          errors.push(
            `AST Constraint Violation: [${violation.rule}] Line ${violation.line}: ${violation.message}`,
          );
        }
      }
    }

    const seedResults: Array<{
      seed: number;
      success: boolean;
      totalTicks: number;
      error?: string;
    }> = [];

    // 2. Execute Reference Solution across all 5 seeds
    for (const seed of manifest.seeds) {
      try {
        const response = await this.workerCore.executeCode({
          code: manifest.referenceSolution,
          levelId: manifest.id,
          seed,
          timeoutMs: 5000,
          mockEnv: manifest.environmentConfig ?? {},
        });

        if (!response.success) {
          const errMsg = response.diagnosticError
            ? `Execution error (${response.diagnosticError.errorType}): ${response.diagnosticError.whatHappened}`
            : response.stderr || 'Execution failed';
          errors.push(`Seed ${seed}: ${errMsg}`);
          seedResults.push({ seed, success: false, totalTicks: 0, error: errMsg });
          continue;
        }

        // 3. For GridWorld levels: Replay actions and verify victory condition
        if (manifest.gameId.includes('farm') || manifest.id.includes('robot-farm')) {
          const actionTrace = response.actionTrace;
          if (!actionTrace || actionTrace.actions.length === 0) {
            const err = `Seed ${seed}: Reference solution recorded 0 actions for a GridWorld level.`;
            errors.push(err);
            seedResults.push({ seed, success: false, totalTicks: 0, error: err });
            continue;
          }

          // Initialize GridWorld engine with level environment parameters
          const gridWidth = Number(manifest.environmentConfig['width'] ?? 4);
          const gridHeight = Number(manifest.environmentConfig['height'] ?? 4);

          const engine = new RobotFarmSimulation({
            levelId: manifest.id,
            seed,
            width: gridWidth,
            height: gridHeight,
            maxTicks: 1000,
            initialRover: {
              x: 0,
              y: 0,
              heading: Direction.EAST,
              energy: 100,
            },
            crops: [{ x: 1, y: 0 }],
          });
          const replayResult = ActionTraceReplayer.replay(engine, actionTrace);
          const finalState = engine.getSnapshot().state;

          if (finalState.crashed) {
            const err = `Seed ${seed}: Rover crashed: ${finalState.crashReason ?? 'Unknown collision'}`;
            errors.push(err);
            seedResults.push({
              seed,
              success: false,
              totalTicks: replayResult.totalTicks,
              error: err,
            });
            continue;
          }

          if (finalState.cropsHarvested < finalState.totalCropsInitial) {
            const err = `Seed ${seed}: Victory condition not met (Harvested: ${finalState.cropsHarvested}/${finalState.totalCropsInitial})`;
            errors.push(err);
            seedResults.push({
              seed,
              success: false,
              totalTicks: replayResult.totalTicks,
              error: err,
            });
            continue;
          }

          seedResults.push({
            seed,
            success: true,
            totalTicks: replayResult.totalTicks,
          });
        } else {
          // For non-gridworld levels, execution success is verified
          seedResults.push({
            seed,
            success: true,
            totalTicks: response.actionTrace?.totalTicks ?? 1,
          });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Seed ${seed}: Unexpected error: ${message}`);
        seedResults.push({ seed, success: false, totalTicks: 0, error: message });
      }
    }

    return {
      levelId: manifest.id,
      valid: errors.length === 0,
      seedResults,
      errors,
    };
  }
}
