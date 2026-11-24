import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LEVEL_1_1_MANIFEST } from '@tensorcade/levels';
import { RobotFarmSimulation } from '@tensorcade/engine';
import {
  buildGridWorldConfig,
  createInitialSnapshotFromManifest,
  evaluateLevelSeeds,
} from './LevelPlayer.js';
import { openTensorcadeDb, type TensorcadeDb } from '../../storage/db.js';
import { useProgressStore } from '../../storage/useProgressStore.js';

function uniqueDbName(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const openDbs: TensorcadeDb[] = [];

async function runLevel11ScriptedWin(mode: 'explorer' | 'hacker') {
  const db = await openTensorcadeDb({ dbName: uniqueDbName(`ttfw_${mode}`) });
  openDbs.push(db);

  const startedAt = performance.now();

  await useProgressStore
    .getState()
    .recordAttempt(LEVEL_1_1_MANIFEST.id, LEVEL_1_1_MANIFEST.worldId, db);

  const evaluation = await evaluateLevelSeeds({
    manifest: LEVEL_1_1_MANIFEST,
    code: 'step()\nharvest()\n',
    mode,
    hintTierReached: 0,
    runPython: async (req) => ({
      success: true,
      executionTimeMs: 1,
      stdout: '',
      stderr: '',
      actionTrace: {
        version: '1.0.0',
        levelId: req.levelId,
        mode,
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

  await useProgressStore.getState().recordCompletion(
    {
      levelId: LEVEL_1_1_MANIFEST.id,
      worldId: LEVEL_1_1_MANIFEST.worldId,
      starsEarned: evaluation.result.starsEarned,
      mode,
      score: evaluation.result.starsEarned * 100,
      efficiency: { ticks: evaluation.maxTicksUsed },
      actionTrace: evaluation.firstActionTraceJson,
      stateHash: evaluation.firstTerminalHash,
    },
    db,
  );

  // Simulate full page reload by clearing in-memory store and rehydrating from IndexedDB
  useProgressStore.getState().resetProgressState();
  await useProgressStore.getState().loadProgress(db);

  const elapsedMs = performance.now() - startedAt;
  const persisted = useProgressStore.getState().progress[LEVEL_1_1_MANIFEST.id];

  return { evaluation, persisted, elapsedMs };
}

describe('Level 1.1 Time-to-First-Win & Instant Reset', () => {
  beforeEach(() => {
    useProgressStore.getState().resetProgressState();
  });

  afterEach(() => {
    while (openDbs.length > 0) {
      openDbs.pop()?.close();
    }
    useProgressStore.getState().resetProgressState();
  });

  it('completes Level 1.1 in Explorer mode across 5 seeds with IndexedDB persistence and reload', async () => {
    const { evaluation, persisted, elapsedMs } = await runLevel11ScriptedWin('explorer');

    expect(evaluation.result.passed).toBe(true);
    expect(evaluation.result.seedsPassed).toBe(5);
    expect(evaluation.result.starsEarned).toBe(2);
    expect(persisted).toBeDefined();
    expect(persisted?.starsEarned).toBe(2);
    expect(persisted?.clearedModes).toContain('explorer');
    expect(elapsedMs).toBeLessThan(5000);
  });

  it('completes Level 1.1 in Hacker mode across 5 seeds with 3 stars, IndexedDB persistence, and reload', async () => {
    const { evaluation, persisted, elapsedMs } = await runLevel11ScriptedWin('hacker');

    expect(evaluation.result.passed).toBe(true);
    expect(evaluation.result.seedsPassed).toBe(5);
    expect(evaluation.result.starsEarned).toBe(3);
    expect(persisted).toBeDefined();
    expect(persisted?.starsEarned).toBe(3);
    expect(persisted?.clearedModes).toContain('hacker');
    expect(elapsedMs).toBeLessThan(5000);
  });

  it('performs instant reset to tick 0 in under 1,000 ms', () => {
    const startedAt = performance.now();

    const snap0 = createInitialSnapshotFromManifest(LEVEL_1_1_MANIFEST);
    const sim = new RobotFarmSimulation(
      buildGridWorldConfig(LEVEL_1_1_MANIFEST, LEVEL_1_1_MANIFEST.seeds[0] ?? 10001),
    );
    const simSnap0 = sim.getSnapshot();

    const resetElapsedMs = performance.now() - startedAt;

    expect(snap0.tick).toBe(0);
    expect(snap0.state.cropsHarvested).toBe(0);
    expect(simSnap0.tick).toBe(0);
    expect(simSnap0.state.rover.x).toBe(0);
    expect(simSnap0.state.rover.y).toBe(0);
    expect(resetElapsedMs).toBeLessThan(1000);
  });
});
