import * as React from 'react';
import type {
  CodeExecutionRequest,
  CodeExecutionResponse,
  DiagnosticError,
  DiscreteAction,
  PlayMode,
} from '@tensorcade/contracts';
import type { EditorWorkspaceProps } from '@tensorcade/editors';
import type {
  Direction,
  EngineSnapshot,
  GridWorldConfig,
  GridWorldState,
  RobotActionParams,
  SimulationOutcome,
} from '@tensorcade/engine';
import type { LevelBundle, LevelManifest } from '@tensorcade/levels/schema';
import { getNextLevelId } from '@tensorcade/levels/dag';
import type { ReplayViewerProps } from '@tensorcade/renderer';
import type { PythonRuntimeClient } from '@tensorcade/runtime';
import { analytics } from '../../analytics/analytics.js';
import { useProgressStore } from '../../storage/useProgressStore.js';
import { useSettingsStore } from '../../storage/useSettingsStore.js';
import { HintLadderModal, type HintTier } from '../HintLadder/HintLadderModal.js';
import { LessonDrawer } from '../LessonPanel/LessonDrawer.js';
import { ResultModal, type LevelResultSummary } from '../ResultModal/ResultModal.js';
import { LevelControlsBar, type PlaybackSpeed } from './LevelControlsBar.js';

const LazyEditorWorkspace = React.lazy(() =>
  import('@tensorcade/editors').then((mod) => ({ default: mod.EditorWorkspace })),
);

const LazyReplayViewer = React.lazy(() =>
  import('@tensorcade/renderer').then((mod) => ({ default: mod.ReplayViewer })),
);

export type RuntimeClientLike = Pick<
  PythonRuntimeClient,
  'init' | 'loadWorldPackages' | 'executeCode' | 'terminate'
>;

export interface RuntimeLifecycle {
  getRunner: (
    worldId: string,
  ) => Promise<(request: CodeExecutionRequest) => Promise<CodeExecutionResponse>>;
  dispose: () => void;
}

/**
 * Manages a single lazy-initialized PythonRuntimeClient per LevelPlayer mount,
 * deduplicating concurrent init calls and guaranteeing worker termination on unmount.
 */
export function createRuntimeLifecycle(
  createClient: () => Promise<RuntimeClientLike>,
): RuntimeLifecycle {
  let client: RuntimeClientLike | null = null;
  let initPromise: Promise<RuntimeClientLike> | null = null;
  const loadedWorlds = new Set<string>();
  const worldLoadPromises = new Map<string, Promise<void>>();
  let disposed = false;

  return {
    async getRunner(worldId: string) {
      if (disposed) {
        throw new Error('LevelPlayer unmounted before Python runtime could start.');
      }
      if (!client) {
        if (!initPromise) {
          initPromise = (async () => {
            const instance = await createClient();
            await instance.init();
            if (disposed) {
              instance.terminate();
              throw new Error('LevelPlayer unmounted before Python runtime finished initializing.');
            }
            client = instance;
            return instance;
          })();
        }
        try {
          client = await initPromise;
        } finally {
          initPromise = null;
        }
      }
      if (!loadedWorlds.has(worldId)) {
        let loadPromise = worldLoadPromises.get(worldId);
        if (!loadPromise) {
          const activeClient = client;
          loadPromise = (async () => {
            await activeClient.loadWorldPackages(worldId);
            if (!disposed) {
              loadedWorlds.add(worldId);
            }
          })();
          worldLoadPromises.set(worldId, loadPromise);
        }
        try {
          await loadPromise;
        } finally {
          worldLoadPromises.delete(worldId);
        }
        if (disposed) {
          throw new Error('LevelPlayer unmounted while loading world packages.');
        }
      }
      const activeClient = client;
      return (request) => activeClient.executeCode(request);
    },

    dispose() {
      disposed = true;
      initPromise = null;
      worldLoadPromises.clear();
      if (client) {
        client.terminate();
        client = null;
      }
      loadedWorlds.clear();
    },
  };
}

export interface SimulationLike {
  getSnapshot: () => EngineSnapshot<GridWorldState>;
  step: (actions?: ReadonlyArray<DiscreteAction<RobotActionParams>>) => void;
  isTerminal: () => boolean;
  getOutcome: () => SimulationOutcome;
}

export interface LevelPlayerProps {
  readonly bundle: LevelBundle;
  readonly onBackToMap?: (() => void) | undefined;
  readonly onNextLevel?: ((nextLevelId: string) => void) | undefined;
  /** Optional dependency injection for Python execution (used in unit tests). */
  readonly executePython?:
    | ((request: CodeExecutionRequest) => Promise<CodeExecutionResponse>)
    | undefined;
  /** Optional dependency injection for simulation engine creation (used in unit tests). */
  readonly createSimulation?: ((config: GridWorldConfig) => SimulationLike) | undefined;
  /** Optional dependency injection for EditorWorkspace (used in unit tests). */
  readonly editorComponent?: React.ComponentType<EditorWorkspaceProps> | undefined;
  /** Optional dependency injection for ReplayViewer (used in unit tests). */
  readonly replayViewerComponent?: React.ComponentType<ReplayViewerProps> | undefined;
  /** Optional override for low-spec mode (defaults to useSettingsStore). */
  readonly lowSpecMode?: boolean | undefined;
}

interface RawRoverConfig {
  x?: number;
  y?: number;
  heading?: string | number;
  energy?: number;
}

interface RawPosition {
  x: number;
  y: number;
}

function parseDirection(heading: string | number | undefined): Direction {
  if (heading === 0 || heading === 'NORTH') return 0;
  if (heading === 1 || heading === 'EAST') return 1;
  if (heading === 2 || heading === 'SOUTH') return 2;
  if (heading === 3 || heading === 'WEST') return 3;
  return 1;
}

export function buildGridWorldConfig(manifest: LevelManifest, seed: number): GridWorldConfig {
  const env = manifest.environmentConfig;
  const rawRover = (env['initialRover'] as RawRoverConfig | undefined) ?? {};
  const width = typeof env['width'] === 'number' ? env['width'] : 4;
  const height = typeof env['height'] === 'number' ? env['height'] : 4;
  const maxTicks = typeof env['maxTicks'] === 'number' ? env['maxTicks'] : 50;
  const crops = Array.isArray(env['crops']) ? (env['crops'] as RawPosition[]) : [];
  const rocks = Array.isArray(env['rocks']) ? (env['rocks'] as RawPosition[]) : undefined;
  const ravines = Array.isArray(env['ravines']) ? (env['ravines'] as RawPosition[]) : undefined;
  const star2TickThreshold =
    typeof env['star2TickThreshold'] === 'number'
      ? env['star2TickThreshold']
      : manifest.scoringRubric.star2.threshold;

  return {
    levelId: manifest.id,
    maxTicks,
    seed,
    width,
    height,
    initialRover: {
      x: typeof rawRover.x === 'number' ? rawRover.x : 0,
      y: typeof rawRover.y === 'number' ? rawRover.y : 0,
      heading: parseDirection(rawRover.heading),
      energy: typeof rawRover.energy === 'number' ? rawRover.energy : 100,
    },
    crops,
    ...(rocks ? { rocks } : {}),
    ...(ravines ? { ravines } : {}),
    star2TickThreshold,
  };
}

export function createInitialSnapshotFromManifest(
  manifest: LevelManifest,
): EngineSnapshot<GridWorldState> {
  const cfg = buildGridWorldConfig(manifest, manifest.seeds[0] ?? 10001);
  const grid: number[][] = Array.from({ length: cfg.height }, () =>
    new Array<number>(cfg.width).fill(0),
  );
  for (const crop of cfg.crops) {
    const row = grid[crop.y];
    if (row && crop.x >= 0 && crop.x < cfg.width) row[crop.x] = 1;
  }
  for (const rock of cfg.rocks ?? []) {
    const row = grid[rock.y];
    if (row && rock.x >= 0 && rock.x < cfg.width) row[rock.x] = 2;
  }
  for (const ravine of cfg.ravines ?? []) {
    const row = grid[ravine.y];
    if (row && ravine.x >= 0 && ravine.x < cfg.width) row[ravine.x] = 3;
  }

  return {
    tick: 0,
    stateHash: 0n,
    stateHashHex: '0000000000000000',
    prngState: cfg.seed >>> 0,
    state: {
      width: cfg.width,
      height: cfg.height,
      rover: {
        x: cfg.initialRover.x,
        y: cfg.initialRover.y,
        heading: cfg.initialRover.heading,
        energy: cfg.initialRover.energy,
        inventory: 0,
      },
      grid,
      totalCropsInitial: cfg.crops.length,
      cropsHarvested: 0,
      crashed: false,
      crashReason: undefined,
    },
  };
}

function mapActionToRobotParams(action: {
  tick: number;
  type: string;
  params: Record<string, unknown>;
}): DiscreteAction<RobotActionParams> {
  const normalizedType = action.type.toUpperCase();
  let robotActionType: RobotActionParams['type'] = 'WAIT';
  if (normalizedType === 'STEP' || normalizedType === 'MOVE_FORWARD') {
    robotActionType = 'MOVE_FORWARD';
  } else if (normalizedType === 'TURN_LEFT') {
    robotActionType = 'TURN_LEFT';
  } else if (normalizedType === 'TURN_RIGHT') {
    robotActionType = 'TURN_RIGHT';
  } else if (normalizedType === 'HARVEST') {
    robotActionType = 'HARVEST';
  }
  return {
    tick: action.tick,
    type: robotActionType,
    params: { type: robotActionType },
  };
}

export interface EvaluateLevelSeedsInput {
  readonly manifest: LevelManifest;
  readonly code: string;
  readonly mode: PlayMode;
  readonly hintTierReached: HintTier;
  readonly runPython: (request: CodeExecutionRequest) => Promise<CodeExecutionResponse>;
  readonly makeSimulation: (config: GridWorldConfig) => SimulationLike;
}

export interface EvaluateLevelSeedsOutput {
  readonly result: LevelResultSummary;
  readonly firstSeedSnapshots: EngineSnapshot<GridWorldState>[];
  readonly diagnosticError?: DiagnosticError | undefined;
  readonly firstActionTraceJson?: string | undefined;
  readonly firstTerminalHash?: string | undefined;
  readonly maxTicksUsed: number;
}

/**
 * Evaluates learner Python code deterministically across all 5 manifest.seeds,
 * runs RobotFarmSimulation for each seed, and computes the 3-star scoring rubric.
 */
export async function evaluateLevelSeeds({
  manifest,
  code,
  mode,
  hintTierReached,
  runPython,
  makeSimulation,
}: EvaluateLevelSeedsInput): Promise<EvaluateLevelSeedsOutput> {
  let seedsPassed = 0;
  let maxTicksUsed = 0;
  let lastEnergyRemaining = 0;
  let firstSeedSnapshots: EngineSnapshot<GridWorldState>[] = [
    createInitialSnapshotFromManifest(manifest),
  ];
  let lastOutcomeMessage: string | undefined;
  let firstActionTraceJson: string | undefined;
  let firstTerminalHash: string | undefined;

  for (let idx = 0; idx < manifest.seeds.length; idx++) {
    const seed = manifest.seeds[idx]!;
    const response = await runPython({
      code,
      levelId: manifest.id,
      seed,
      timeoutMs: 5000,
      mockEnv: manifest.environmentConfig,
    });

    if (!response.success || response.diagnosticError) {
      return {
        result: {
          passed: false,
          starsEarned: 0,
          star1Earned: false,
          star2Earned: false,
          star3Earned: false,
          ticks: 0,
          energyRemaining: 0,
          mode,
          seedsPassed,
          totalSeeds: manifest.seeds.length,
          message: response.diagnosticError?.whatHappened ?? 'Execution failed.',
        },
        firstSeedSnapshots,
        diagnosticError: response.diagnosticError,
        maxTicksUsed: 0,
      };
    }

    const simConfig = buildGridWorldConfig(manifest, seed);
    const sim = makeSimulation(simConfig);
    const seedSnapshots: EngineSnapshot<GridWorldState>[] = [sim.getSnapshot()];
    const actions = response.actionTrace?.actions ?? [];

    for (const rawAction of actions) {
      if (sim.isTerminal()) break;
      sim.step([mapActionToRobotParams(rawAction)]);
      seedSnapshots.push(sim.getSnapshot());
    }

    const outcome = sim.getOutcome();
    if (idx === 0) {
      firstSeedSnapshots = seedSnapshots;
      firstActionTraceJson = response.actionTrace
        ? JSON.stringify(response.actionTrace)
        : undefined;
      firstTerminalHash = outcome.terminalHash;
    }

    maxTicksUsed = Math.max(maxTicksUsed, outcome.terminalTick || seedSnapshots.length - 1);
    lastEnergyRemaining =
      typeof outcome.metrics['energyRemaining'] === 'number'
        ? outcome.metrics['energyRemaining']
        : 0;
    lastOutcomeMessage = outcome.message;

    if (outcome.status === 'WON') {
      seedsPassed += 1;
    }
  }

  const passed = seedsPassed === manifest.seeds.length;
  const star1Earned = passed;
  const star2Earned = passed && maxTicksUsed <= manifest.scoringRubric.star2.threshold;
  const star3Earned = passed && star2Earned && mode === 'hacker' && hintTierReached === 0;
  const starsEarned: 0 | 1 | 2 | 3 = !star1Earned ? 0 : star3Earned ? 3 : star2Earned ? 2 : 1;

  return {
    result: {
      passed,
      starsEarned,
      star1Earned,
      star2Earned,
      star3Earned,
      ticks: maxTicksUsed,
      energyRemaining: lastEnergyRemaining,
      mode,
      seedsPassed,
      totalSeeds: manifest.seeds.length,
      message: lastOutcomeMessage,
    },
    firstSeedSnapshots,
    firstActionTraceJson,
    firstTerminalHash,
    maxTicksUsed,
  };
}

/**
 * Interactive LevelPlayer orchestrating EditorWorkspace, ReplayViewer,
 * LessonDrawer, HintLadderModal, ResultModal, and deterministic 5-seed evaluation.
 */
export function LevelPlayer({
  bundle,
  onBackToMap,
  onNextLevel,
  executePython,
  createSimulation,
  editorComponent: EditorComp = LazyEditorWorkspace,
  replayViewerComponent: ReplayComp = LazyReplayViewer,
  lowSpecMode: lowSpecModeProp,
}: LevelPlayerProps): React.JSX.Element {
  const { manifest, lessonContentMarkdown } = bundle;
  const preferredMode = useSettingsStore((state) => state.preferredMode);
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  const storeLowSpecMode = useSettingsStore((state) => state.lowSpecMode);
  const lowSpecMode = lowSpecModeProp ?? storeLowSpecMode;
  const storedHintTier = useProgressStore(
    (state) => state.progress[manifest.id]?.hintTierReached ?? 0,
  );
  const recordAttempt = useProgressStore((state) => state.recordAttempt);
  const recordCompletion = useProgressStore((state) => state.recordCompletion);

  const initialMode: PlayMode = React.useMemo(() => {
    if (manifest.supportedModes.includes(preferredMode)) {
      return preferredMode;
    }
    return manifest.supportedModes[0] ?? 'explorer';
  }, [manifest.supportedModes, preferredMode]);

  const [mode, setMode] = React.useState<PlayMode>(initialMode);
  const [code, setCode] = React.useState<string>(() => manifest.starterCode[initialMode] ?? '');
  const [speed, setSpeed] = React.useState<PlaybackSpeed>(1);
  const [isLessonOpen, setIsLessonOpen] = React.useState<boolean>(true);
  const [isHintModalOpen, setIsHintModalOpen] = React.useState<boolean>(false);
  const [isResultModalOpen, setIsResultModalOpen] = React.useState<boolean>(false);
  const [isRunning, setIsRunning] = React.useState<boolean>(false);
  const [runtimeError, setRuntimeError] = React.useState<string | null>(null);
  const [diagnosticError, setDiagnosticError] = React.useState<DiagnosticError | undefined>(
    undefined,
  );
  const [result, setResult] = React.useState<LevelResultSummary | null>(null);
  const [hintTierReached, setHintTierReached] = React.useState<HintTier>(storedHintTier);
  const [snapshots, setSnapshots] = React.useState<ReadonlyArray<EngineSnapshot<GridWorldState>>>(
    () => [createInitialSnapshotFromManifest(manifest)],
  );
  const [currentTickIndex, setCurrentTickIndex] = React.useState<number>(0);

  const isRunningRef = React.useRef<boolean>(false);
  const runtimeLifecycleRef = React.useRef<RuntimeLifecycle | null>(null);

  React.useEffect(() => {
    const lifecycle = createRuntimeLifecycle(async () => {
      const { PythonRuntimeClient: ClientClass } = await import('@tensorcade/runtime');
      return new ClientClass();
    });
    runtimeLifecycleRef.current = lifecycle;
    return () => {
      lifecycle.dispose();
      if (runtimeLifecycleRef.current === lifecycle) {
        runtimeLifecycleRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    setHintTierReached((prev) => (storedHintTier > prev ? storedHintTier : prev));
  }, [storedHintTier]);

  React.useEffect(() => {
    analytics.track('level_started', {
      levelId: manifest.id,
      worldId: manifest.worldId,
      mode: initialMode,
    });
  }, [manifest.id, manifest.worldId, initialMode]);

  const getRuntimeRunner = React.useCallback(async (): Promise<
    (request: CodeExecutionRequest) => Promise<CodeExecutionResponse>
  > => {
    if (executePython) {
      return executePython;
    }
    if (!runtimeLifecycleRef.current) {
      runtimeLifecycleRef.current = createRuntimeLifecycle(async () => {
        const { PythonRuntimeClient: ClientClass } = await import('@tensorcade/runtime');
        return new ClientClass();
      });
    }
    return runtimeLifecycleRef.current.getRunner(manifest.worldId);
  }, [executePython, manifest.worldId]);

  const getSimulationFactory = React.useCallback(async (): Promise<
    (config: GridWorldConfig) => SimulationLike
  > => {
    if (createSimulation) {
      return createSimulation;
    }
    const { RobotFarmSimulation } = await import('@tensorcade/engine');
    return (config) => new RobotFarmSimulation(config);
  }, [createSimulation]);

  const handleInstantReset = React.useCallback(() => {
    setSnapshots([createInitialSnapshotFromManifest(manifest)]);
    setCurrentTickIndex(0);
    setDiagnosticError(undefined);
    setRuntimeError(null);
    setIsResultModalOpen(false);
  }, [manifest]);

  const handleStep = React.useCallback(() => {
    setCurrentTickIndex((prev) => Math.min(prev + 1, Math.max(0, snapshots.length - 1)));
  }, [snapshots.length]);

  const handleModeChange = React.useCallback(
    (nextMode: PlayMode) => {
      if (nextMode === mode) return;
      analytics.track('mode_switched', {
        fromMode: mode,
        toMode: nextMode,
        levelId: manifest.id,
      });
      setMode(nextMode);
    },
    [manifest.id, mode],
  );

  const handleRun = React.useCallback(
    async (submittedCode?: string, submittedMode?: PlayMode) => {
      if (isRunningRef.current) {
        return;
      }
      isRunningRef.current = true;
      const activeCode = submittedCode ?? code;
      const activeMode = submittedMode ?? mode;

      setIsRunning(true);
      setDiagnosticError(undefined);
      setRuntimeError(null);
      setIsResultModalOpen(false);

      try {
        await recordAttempt(manifest.id, manifest.worldId);
        const runPython = await getRuntimeRunner();
        const makeSimulation = await getSimulationFactory();

        const evaluation = await evaluateLevelSeeds({
          manifest,
          code: activeCode,
          mode: activeMode,
          hintTierReached,
          runPython,
          makeSimulation,
        });

        if (evaluation.diagnosticError) {
          setDiagnosticError(evaluation.diagnosticError);
          analytics.track('error_encountered', {
            code: evaluation.diagnosticError.errorType,
            message: evaluation.diagnosticError.whatHappened,
            context: manifest.id,
          });
          setResult(evaluation.result);
          setIsResultModalOpen(true);
          return;
        }

        setSnapshots(evaluation.firstSeedSnapshots);
        setCurrentTickIndex(evaluation.firstSeedSnapshots.length - 1);

        await recordCompletion({
          levelId: manifest.id,
          worldId: manifest.worldId,
          starsEarned: evaluation.result.starsEarned,
          mode: activeMode,
          score: evaluation.result.starsEarned * 100,
          efficiency: { ticks: evaluation.maxTicksUsed },
          actionTrace: evaluation.firstActionTraceJson,
          stateHash: evaluation.firstTerminalHash,
        });

        analytics.track('level_completed', {
          levelId: manifest.id,
          worldId: manifest.worldId,
          mode: activeMode,
          starsEarned: evaluation.result.starsEarned,
          score: evaluation.result.starsEarned * 100,
          ticks: evaluation.maxTicksUsed,
        });

        setResult(evaluation.result);
        setIsResultModalOpen(true);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Unexpected simulation or runtime failure.';
        setRuntimeError(message);
        analytics.track('error_encountered', {
          code: 'RUNTIME_FAILURE',
          message,
          context: manifest.id,
        });
      } finally {
        isRunningRef.current = false;
        setIsRunning(false);
      }
    },
    [
      code,
      getRuntimeRunner,
      getSimulationFactory,
      hintTierReached,
      manifest,
      mode,
      recordAttempt,
      recordCompletion,
    ],
  );

  const handleContainerKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.defaultPrevented) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        void handleRun();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleInstantReset();
        return;
      }
      if (e.key === ' ' && e.target === e.currentTarget) {
        e.preventDefault();
        handleStep();
      }
    },
    [handleInstantReset, handleRun, handleStep],
  );

  const envConfig = manifest.environmentConfig;
  const gridWidth = typeof envConfig['width'] === 'number' ? envConfig['width'] : 4;
  const gridHeight = typeof envConfig['height'] === 'number' ? envConfig['height'] : 4;
  const nextLevelId = getNextLevelId(manifest.id);

  const replayConfig = React.useMemo(
    () => ({
      width: gridWidth,
      height: gridHeight,
      maxDpr: lowSpecMode ? 1 : 2,
      reducedMotion,
    }),
    [gridWidth, gridHeight, lowSpecMode, reducedMotion],
  );

  return (
    <div
      data-testid="level-player"
      tabIndex={-1}
      onKeyDown={handleContainerKeyDown}
      className="flex flex-col min-h-[calc(100vh-8rem)] bg-[var(--tc-bg-base)] text-[var(--tc-text-primary)]"
    >
      <LevelControlsBar
        levelTitle={manifest.title}
        isRunning={isRunning}
        speed={speed}
        isLessonOpen={isLessonOpen}
        hintTierReached={hintTierReached}
        onBackToMap={() => onBackToMap?.()}
        onRun={() => void handleRun()}
        onStep={handleStep}
        onReset={handleInstantReset}
        onSpeedChange={setSpeed}
        onOpenHints={() => setIsHintModalOpen(true)}
        onToggleLesson={() => setIsLessonOpen((prev) => !prev)}
      />

      {runtimeError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-[var(--tc-radius-sm)] border border-[var(--tc-accent-crimson)] bg-[var(--tc-bg-surface)] px-4 py-2.5 text-xs text-[var(--tc-text-primary)]"
        >
          <span className="font-mono">
            <strong className="text-[var(--tc-accent-crimson)]">Runtime Error:</strong>{' '}
            {runtimeError}
          </span>
          <button
            type="button"
            onClick={() => setRuntimeError(null)}
            aria-label="Dismiss runtime error"
            className="rounded-[var(--tc-radius-sm)] px-2 py-1 font-mono text-xs text-[var(--tc-text-muted)] hover:bg-[var(--tc-border-subtle)] hover:text-[var(--tc-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--tc-accent-cyan)] focus-visible:outline-offset-[var(--tc-focus-outline-offset)]"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4">
        {isLessonOpen && (
          <div className="lg:col-span-3">
            <LessonDrawer
              isOpen={isLessonOpen}
              title={manifest.title}
              conceptTag={manifest.conceptTag}
              bloomLevel={manifest.bloomLevel}
              estimatedMinutes={manifest.estimatedMinutes}
              lessonContentMarkdown={lessonContentMarkdown}
              simplificationLabel={manifest.simplificationLabel}
              learningObjective={manifest.learningObjective}
              onClose={() => setIsLessonOpen(false)}
              className="h-full"
            />
          </div>
        )}

        <section
          aria-label="Simulation Viewport"
          className={isLessonOpen ? 'lg:col-span-4' : 'lg:col-span-6'}
        >
          <React.Suspense
            fallback={
              <div className="flex h-80 items-center justify-center rounded-[var(--tc-radius-md)] border border-[var(--tc-border-subtle)] bg-[var(--tc-bg-surface)] font-mono text-xs text-[var(--tc-text-muted)]">
                Loading simulation viewport…
              </div>
            }
          >
            <ReplayComp
              snapshots={snapshots}
              config={replayConfig}
              levelTitle={manifest.title}
              tickIndex={currentTickIndex}
              onTickIndexChange={setCurrentTickIndex}
              speed={speed}
              onSpeedChange={(nextSpeed) => {
                if (nextSpeed === 0.5 || nextSpeed === 1 || nextSpeed === 2 || nextSpeed === 4) {
                  setSpeed(nextSpeed);
                }
              }}
              className="h-full"
            />
          </React.Suspense>
          <p className="mt-1 font-mono text-xs text-[var(--tc-text-muted)]">
            Active Tick: {currentTickIndex} / {Math.max(0, snapshots.length - 1)} &bull; Speed:{' '}
            {speed}x
          </p>
        </section>

        <section
          aria-label="Code Editor Workspace"
          className={isLessonOpen ? 'lg:col-span-5' : 'lg:col-span-6'}
        >
          <React.Suspense
            fallback={
              <div className="flex h-80 items-center justify-center rounded-[var(--tc-radius-md)] border border-[var(--tc-border-subtle)] bg-[var(--tc-bg-surface)] font-mono text-xs text-[var(--tc-text-muted)]">
                Loading editor workspace…
              </div>
            }
          >
            <EditorComp
              mode={mode}
              onModeChange={handleModeChange}
              supportedModes={manifest.supportedModes}
              level={manifest}
              starterCode={manifest.starterCode}
              parsonsBlocks={manifest.parsonsBlocks}
              blocklyToolbox={manifest.blocklyToolbox}
              diagnosticError={diagnosticError}
              onDismissDiagnosticError={() => setDiagnosticError(undefined)}
              onCodeChange={(nextCode) => setCode(nextCode)}
              onRun={(submittedCode, submittedMode) => void handleRun(submittedCode, submittedMode)}
            />
          </React.Suspense>
        </section>
      </div>

      <HintLadderModal
        isOpen={isHintModalOpen}
        onOpenChange={setIsHintModalOpen}
        levelId={manifest.id}
        worldId={manifest.worldId}
        hintLadder={manifest.hintLadder}
        currentMode={mode}
        supportedModes={manifest.supportedModes}
        initialTierReached={hintTierReached}
        onHintTierChange={setHintTierReached}
        onSwitchToBuilder={() => handleModeChange('builder')}
      />

      <ResultModal
        isOpen={isResultModalOpen}
        onOpenChange={setIsResultModalOpen}
        levelTitle={manifest.title}
        scoringRubric={manifest.scoringRubric}
        result={result}
        supportedModes={manifest.supportedModes}
        nextLevelId={nextLevelId}
        onGraduateToHacker={() => handleModeChange('hacker')}
        onNextLevel={onNextLevel}
        onRetry={handleInstantReset}
      />
    </div>
  );
}
