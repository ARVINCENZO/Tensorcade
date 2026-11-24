import { describe, it, expect, beforeEach } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LEVEL_1_1_BUNDLE, LEVEL_1_1_MANIFEST } from '@tensorcade/levels';
import { Direction, RobotFarmSimulation } from '@tensorcade/engine';
import { LevelControlsBar } from './LevelControlsBar.js';
import {
  LevelPlayer,
  buildGridWorldConfig,
  createInitialSnapshotFromManifest,
  createRuntimeLifecycle,
  evaluateLevelSeeds,
  type RuntimeClientLike,
} from './LevelPlayer.js';
import { useProgressStore } from '../../storage/useProgressStore.js';
import type { ReplayViewerProps } from '@tensorcade/renderer';
import { levelRoute } from '../../routes/level.$levelId.js';
import { routeTree } from '../../router.js';

describe('LevelControlsBar & LevelPlayer', () => {
  beforeEach(() => {
    useProgressStore.getState().resetProgressState();
  });

  it('renders all required controls in LevelControlsBar', () => {
    const html = renderToStaticMarkup(
      <LevelControlsBar
        levelTitle={LEVEL_1_1_MANIFEST.title}
        isRunning={false}
        speed={1}
        isLessonOpen={true}
        hintTierReached={1}
        onBackToMap={() => {}}
        onRun={() => {}}
        onStep={() => {}}
        onReset={() => {}}
        onSpeedChange={() => {}}
        onOpenHints={() => {}}
        onToggleLesson={() => {}}
      />,
    );

    expect(html).toContain('Back to World Map');
    expect(html).toContain('Run / Submit');
    expect(html).toContain('Step');
    expect(html).toContain('Reset');
    expect(html).toContain('0.5x');
    expect(html).toContain('1x');
    expect(html).toContain('2x');
    expect(html).toContain('4x');
    expect(html).toContain('Hints (1/3)');
    expect(html).toContain('Lesson');
  });

  it('uses React.lazy / dynamic import() for heavy packages to protect bundle budget', () => {
    const source = readFileSync(resolve(import.meta.dirname, './LevelPlayer.tsx'), 'utf8');
    expect(source).toContain("import('@tensorcade/editors')");
    expect(source).toContain("import('@tensorcade/renderer')");
    expect(source).toContain("import('@tensorcade/runtime')");
    expect(source).toContain("import('@tensorcade/engine')");
    // Ensure no static value imports from heavy packages
    expect(source).not.toMatch(
      /^import\s+\{[^}]*\}\s+from\s+['"]@tensorcade\/(editors|renderer|runtime|engine)['"]/m,
    );
  });

  it('maps manifest environmentConfig to GridWorldConfig and tick-0 snapshot', () => {
    const cfg = buildGridWorldConfig(LEVEL_1_1_MANIFEST, 10001);
    expect(cfg.initialRover.heading).toBe(Direction.EAST);
    expect(cfg.crops).toEqual([{ x: 1, y: 0 }]);

    const snap0 = createInitialSnapshotFromManifest(LEVEL_1_1_MANIFEST);
    expect(snap0.tick).toBe(0);
    expect(snap0.state.rover.x).toBe(0);
    expect(snap0.state.rover.y).toBe(0);
    expect(snap0.state.cropsHarvested).toBe(0);
  });

  it('evaluates all 5 seeds with RobotFarmSimulation and computes 3-star rubric', async () => {
    const executedSeeds: number[] = [];
    const evaluation = await evaluateLevelSeeds({
      manifest: LEVEL_1_1_MANIFEST,
      code: 'step()\nharvest()\n',
      mode: 'hacker',
      hintTierReached: 0,
      runPython: async (req) => {
        executedSeeds.push(req.seed);
        return {
          success: true,
          executionTimeMs: 5,
          stdout: '',
          stderr: '',
          actionTrace: {
            version: '1.0.0',
            levelId: req.levelId,
            mode: 'hacker',
            seed: req.seed,
            totalTicks: 2,
            actions: [
              { tick: 1, type: 'STEP', params: {} },
              { tick: 2, type: 'HARVEST', params: {} },
            ],
            clientTerminalHash: '0000000000000000',
          },
        };
      },
      makeSimulation: (config) => new RobotFarmSimulation(config),
    });

    expect(executedSeeds).toEqual(LEVEL_1_1_MANIFEST.seeds);
    expect(evaluation.result.passed).toBe(true);
    expect(evaluation.result.starsEarned).toBe(3);
    expect(evaluation.result.star1Earned).toBe(true);
    expect(evaluation.result.star2Earned).toBe(true);
    expect(evaluation.result.star3Earned).toBe(true);
    expect(evaluation.result.ticks).toBe(2);
    expect(evaluation.firstSeedSnapshots.length).toBe(3);
  });

  it('awards 2 stars when hints were used in hacker mode', async () => {
    const evaluation = await evaluateLevelSeeds({
      manifest: LEVEL_1_1_MANIFEST,
      code: 'step()\nharvest()\n',
      mode: 'hacker',
      hintTierReached: 3,
      runPython: async (req) => ({
        success: true,
        executionTimeMs: 4,
        stdout: '',
        stderr: '',
        actionTrace: {
          version: '1.0.0',
          levelId: req.levelId,
          mode: 'hacker',
          seed: req.seed,
          totalTicks: 2,
          actions: [
            { tick: 1, type: 'STEP', params: {} },
            { tick: 2, type: 'HARVEST', params: {} },
          ],
          clientTerminalHash: '0000000000000000',
        },
      }),
      makeSimulation: (config) => new RobotFarmSimulation(config),
    });

    expect(evaluation.result.starsEarned).toBe(2);
    expect(evaluation.result.star3Earned).toBe(false);
  });

  it('renders LevelPlayer layout with injected lightweight editor and replay viewer', () => {
    const MockEditor = () => <div data-testid="mock-editor">Editor</div>;
    const MockReplay = () => <div data-testid="mock-replay">Replay</div>;

    const html = renderToStaticMarkup(
      <LevelPlayer
        bundle={LEVEL_1_1_BUNDLE}
        editorComponent={MockEditor}
        replayViewerComponent={MockReplay}
      />,
    );

    expect(html).toContain('data-testid="level-player"');
    expect(html).toContain('First Furrow');
    expect(html).toContain('data-testid="mock-editor"');
    expect(html).toContain('data-testid="mock-replay"');
  });

  it('passes lowSpecMode maxDpr and controlled tick/speed props to ReplayViewer', () => {
    let capturedProps: ReplayViewerProps | null = null;
    const MockEditor = () => <div data-testid="mock-editor">Editor</div>;
    const MockReplay = (props: ReplayViewerProps) => {
      capturedProps = props;
      return <div data-testid="mock-replay">Replay</div>;
    };

    renderToStaticMarkup(
      <LevelPlayer
        bundle={LEVEL_1_1_BUNDLE}
        editorComponent={MockEditor}
        replayViewerComponent={MockReplay}
        lowSpecMode={true}
      />,
    );

    expect(capturedProps).not.toBeNull();
    expect(capturedProps!.config.maxDpr).toBe(1);
    expect(capturedProps!.tickIndex).toBe(0);
    expect(capturedProps!.speed).toBe(1);
    expect(typeof capturedProps!.onTickIndexChange).toBe('function');
    expect(typeof capturedProps!.onSpeedChange).toBe('function');
  });

  it('registers /level/$levelId route in router', () => {
    expect(levelRoute).toBeDefined();
    expect(levelRoute.id).toBe('/level/$levelId');
    expect(routeTree.children).toBeDefined();

    const routeSource = readFileSync(
      resolve(import.meta.dirname, '../../routes/level.$levelId.tsx'),
      'utf8',
    );
    expect(routeSource).toContain('key={bundle.manifest.id}');
  });

  it('terminates Python runtime worker on dispose and deduplicates concurrent init calls', async () => {
    let initCount = 0;
    let terminateCount = 0;
    const loadedWorlds: string[] = [];

    const mockClient: RuntimeClientLike = {
      init: async () => {
        initCount += 1;
        return {
          pyodideVersion: '314.0.8',
          pythonVersion: '3.14.2',
          memoryLimitMb: 2048,
        };
      },
      loadWorldPackages: async (worldId) => {
        loadedWorlds.push(worldId);
        return true;
      },
      executeCode: async () => ({
        success: true,
        executionTimeMs: 1,
        stdout: '',
        stderr: '',
      }),
      terminate: () => {
        terminateCount += 1;
      },
    };

    const lifecycle = createRuntimeLifecycle(async () => mockClient);
    const [runnerA, runnerB] = await Promise.all([
      lifecycle.getRunner('world-1'),
      lifecycle.getRunner('world-1'),
    ]);

    expect(initCount).toBe(1);
    expect(loadedWorlds).toEqual(['world-1']);
    await runnerA({
      code: 'step()',
      levelId: 'w1-robot-farm-1.1',
      seed: 10001,
      timeoutMs: 5000,
      mockEnv: {},
    });
    await runnerB({
      code: 'step()',
      levelId: 'w1-robot-farm-1.1',
      seed: 10002,
      timeoutMs: 5000,
      mockEnv: {},
    });

    lifecycle.dispose();
    expect(terminateCount).toBe(1);
  });

  it('terminates late-initializing worker if disposed mid-init', async () => {
    let resolveInit!: () => void;
    let terminateCount = 0;

    const mockClient: RuntimeClientLike = {
      init: () =>
        new Promise((resolve) => {
          resolveInit = () =>
            resolve({
              pyodideVersion: '314.0.8',
              pythonVersion: '3.14.2',
              memoryLimitMb: 2048,
            });
        }),
      loadWorldPackages: async () => true,
      executeCode: async () => ({
        success: true,
        executionTimeMs: 1,
        stdout: '',
        stderr: '',
      }),
      terminate: () => {
        terminateCount += 1;
      },
    };

    const lifecycle = createRuntimeLifecycle(async () => mockClient);
    const pendingRunner = lifecycle.getRunner('world-1');
    await Promise.resolve();
    lifecycle.dispose();
    resolveInit();

    await expect(pendingRunner).rejects.toThrow(/unmounted/i);
    expect(terminateCount).toBe(1);
  });
});
