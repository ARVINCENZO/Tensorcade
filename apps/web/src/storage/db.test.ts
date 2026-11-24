import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import {
  clearSyncQueue,
  closeSharedTensorcadeDb,
  DEFAULT_USER_PROFILE_ID,
  enqueueSyncItem,
  getAllLevelProgress,
  getLevelProgress,
  getPendingSyncItems,
  getSharedTensorcadeDb,
  getUserProfile,
  mergeLevelProgress,
  openTensorcadeDb,
  putLevelProgress,
  putUserProfile,
  removeSyncItem,
  type LevelProgressRecord,
  type TensorcadeDb,
  type UserProfileRecord,
} from './db.js';
import { useSettingsStore } from './useSettingsStore.js';
import { isLevelUnlocked, useProgressStore } from './useProgressStore.js';

function uniqueDbName(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const openDbs: TensorcadeDb[] = [];

afterEach(() => {
  while (openDbs.length > 0) {
    const db = openDbs.pop();
    db?.close();
  }
  useProgressStore.getState().resetProgressState();
});

describe('apps/web/src/storage - IndexedDB & Zustand Stores', () => {
  it('performs CRUD operations on user_profile, level_progress, and sync_queue', async () => {
    const dbName = uniqueDbName('tc_crud');
    const db = await openTensorcadeDb({ dbName });
    openDbs.push(db);

    const profile: UserProfileRecord = {
      id: DEFAULT_USER_PROFILE_ID,
      username: 'ada_lovelace',
      settings: {
        theme: 'high-contrast',
        reducedMotion: true,
        lowSpecMode: true,
        acousticTelemetry: false,
        preferredMode: 'hacker',
        consentAnalytics: false,
      },
      updatedAt: 1000,
    };
    await putUserProfile(db, profile);
    const loadedProfile = await getUserProfile(db);
    expect(loadedProfile).toEqual(profile);

    const progress: LevelProgressRecord = {
      levelId: 'w1-l1',
      worldId: 'world-1',
      starsEarned: 2,
      clearedModes: ['explorer'],
      attempts: 3,
      bestScore: 850,
      bestEfficiency: { ticks: 42 },
      hintTierReached: 1,
      bestActionTrace: '{"actions":[]}',
      stateHash: '0123456789abcdef',
      synced: false,
      updatedAt: 2000,
    };
    await putLevelProgress(db, progress);
    expect(await getLevelProgress(db, 'w1-l1')).toEqual(progress);
    expect(await getAllLevelProgress(db)).toHaveLength(1);

    await enqueueSyncItem(db, {
      id: 'sync-1',
      type: 'progress_upsert',
      payload: { levelId: 'w1-l1' },
      createdAt: 2001,
      retryCount: 0,
    });
    expect(await getPendingSyncItems(db)).toHaveLength(1);

    await removeSyncItem(db, 'sync-1');
    expect(await getPendingSyncItems(db)).toHaveLength(0);

    await enqueueSyncItem(db, {
      id: 'sync-2',
      type: 'trace_verify',
      payload: { levelId: 'w1-l1' },
      createdAt: 2002,
      retryCount: 0,
    });
    await clearSyncQueue(db);
    expect(await getPendingSyncItems(db)).toHaveLength(0);
  });

  it('persists settings and progress across database close and reload', async () => {
    const dbName = uniqueDbName('tc_reload');
    const db1 = await openTensorcadeDb({ dbName });

    await useSettingsStore.getState().setTheme('high-contrast', db1);
    await useSettingsStore.getState().setLowSpecMode(true, db1);
    await useSettingsStore.getState().setConsentAnalytics(true, db1);
    await useProgressStore.getState().recordCompletion(
      {
        levelId: 'w1-l2',
        worldId: 'world-1',
        starsEarned: 3,
        mode: 'builder',
        score: 990,
        efficiency: { ticks: 18 },
      },
      db1,
    );
    db1.close();

    // Reset in-memory Zustand state to simulate page reload
    await useSettingsStore.getState().resetSettings();
    useProgressStore.getState().resetProgressState();

    const db2 = await openTensorcadeDb({ dbName });
    openDbs.push(db2);
    await useSettingsStore.getState().loadSettings(db2);
    await useProgressStore.getState().loadProgress(db2);

    expect(useSettingsStore.getState().theme).toBe('high-contrast');
    expect(useSettingsStore.getState().lowSpecMode).toBe(true);
    expect(useSettingsStore.getState().consentAnalytics).toBe(true);

    const reloaded = useProgressStore.getState().progress['w1-l2'];
    expect(reloaded?.starsEarned).toBe(3);
    expect(reloaded?.clearedModes).toEqual(['builder']);
    expect(reloaded?.bestScore).toBe(990);
  });

  it('enforces monotonic max-star merge and clearedModes union', async () => {
    const dbName = uniqueDbName('tc_merge');
    const db = await openTensorcadeDb({ dbName });
    openDbs.push(db);

    await mergeLevelProgress(db, {
      levelId: 'w2-l1',
      worldId: 'world-2',
      starsEarned: 3,
      clearedModes: ['explorer'],
      attempts: 2,
      bestScore: 950,
      bestEfficiency: { ticks: 30 },
      hintTierReached: 1,
      bestActionTrace: 'trace-3-stars',
      stateHash: 'aaaaaaaaaaaaaaaa',
      synced: true,
      updatedAt: 100,
    });

    // Incoming record has fewer stars (1) but cleared a new mode ('hacker') and used more hints
    const merged = await mergeLevelProgress(db, {
      levelId: 'w2-l1',
      worldId: 'world-2',
      starsEarned: 1,
      clearedModes: ['hacker'],
      attempts: 5,
      bestScore: 600,
      bestEfficiency: { ticks: 50 },
      hintTierReached: 2,
      bestActionTrace: 'trace-1-star',
      stateHash: 'bbbbbbbbbbbbbbbb',
      synced: false,
      updatedAt: 200,
    });

    expect(merged.starsEarned).toBe(3);
    expect(merged.clearedModes).toEqual(['explorer', 'hacker']);
    expect(merged.bestScore).toBe(950);
    expect(merged.hintTierReached).toBe(2);
    expect(merged.attempts).toBe(5);
    expect(merged.bestActionTrace).toBe('trace-3-stars');
    expect(merged.synced).toBe(false);
  });

  it('migrates schema from v1 to v2 without data loss', async () => {
    const dbName = uniqueDbName('tc_migrate_v1_v2');

    // 1. Open at v1 and seed all three v1 stores
    const dbV1 = await openTensorcadeDb({ dbName, version: 1 });
    await putUserProfile(dbV1, {
      id: DEFAULT_USER_PROFILE_ID,
      username: 'grace_hopper',
      settings: {
        theme: 'dark',
        reducedMotion: false,
        lowSpecMode: false,
        acousticTelemetry: true,
        preferredMode: 'builder',
        consentAnalytics: null,
      },
      updatedAt: 500,
    });
    await putLevelProgress(dbV1, {
      levelId: 'w1-l1',
      worldId: 'world-1',
      starsEarned: 2,
      clearedModes: ['explorer'],
      attempts: 4,
      bestScore: 780,
      hintTierReached: 0,
      synced: false,
      updatedAt: 501,
    });
    await enqueueSyncItem(dbV1, {
      id: 'queued-v1',
      type: 'progress_upsert',
      payload: { levelId: 'w1-l1', starsEarned: 2 },
      createdAt: 502,
      retryCount: 1,
    });
    dbV1.close();

    // 2. Re-open at v2 to trigger v1 -> v2 migration
    const dbV2 = await openTensorcadeDb({ dbName, version: 2 });
    openDbs.push(dbV2);

    expect(dbV2.version).toBe(2);
    expect(dbV2.objectStoreNames.contains('code_snapshots')).toBe(true);
    expect(dbV2.transaction('level_progress').store.indexNames.contains('by-updatedAt')).toBe(true);

    // 3. Verify all v1 data is preserved intact
    const migratedProfile = await getUserProfile(dbV2);
    expect(migratedProfile?.username).toBe('grace_hopper');
    expect(migratedProfile?.settings.acousticTelemetry).toBe(true);

    const migratedProgress = await getLevelProgress(dbV2, 'w1-l1');
    expect(migratedProgress?.starsEarned).toBe(2);
    expect(migratedProgress?.bestScore).toBe(780);

    const migratedQueue = await getPendingSyncItems(dbV2);
    expect(migratedQueue).toHaveLength(1);
    expect(migratedQueue[0]?.id).toBe('queued-v1');
  });

  it('evaluates decoupled DAG prerequisites cleanly', () => {
    const prereqs = {
      'w1-l2': ['w1-l1'],
      'w1-l3': ['w1-l1', 'w1-l2'],
    };

    const progress: Record<string, LevelProgressRecord> = {
      'w1-l1': {
        levelId: 'w1-l1',
        worldId: 'world-1',
        starsEarned: 1,
        clearedModes: ['explorer'],
        attempts: 1,
        bestScore: 500,
        hintTierReached: 0,
        synced: false,
        updatedAt: 100,
      },
    };

    expect(isLevelUnlocked('w1-l1', progress, prereqs)).toBe(true);
    expect(isLevelUnlocked('w1-l2', progress, prereqs)).toBe(true);
    expect(isLevelUnlocked('w1-l3', progress, prereqs)).toBe(false);
  });

  it('memoizes shared IndexedDB handle across calls and reopens cleanly after close', async () => {
    const [dbA, dbB] = await Promise.all([getSharedTensorcadeDb(), getSharedTensorcadeDb()]);
    expect(dbA).toBe(dbB);

    await closeSharedTensorcadeDb();
    const dbC = await getSharedTensorcadeDb();
    expect(dbC).not.toBe(dbA);
    await closeSharedTensorcadeDb();
  });
});
