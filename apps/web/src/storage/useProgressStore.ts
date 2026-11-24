import { create } from 'zustand';
import type { PlayMode } from '@tensorcade/contracts';
import {
  enqueueSyncItem,
  getAllLevelProgress,
  getSharedTensorcadeDb,
  mergeLevelProgress,
  mergeLevelProgressRecords,
  type EfficiencyMetrics,
  type LevelProgressRecord,
  type TensorcadeDb,
} from './db.js';

export type PrerequisitesMap = Readonly<Record<string, readonly string[]>>;

export interface RecordCompletionInput {
  levelId: string;
  worldId: string;
  starsEarned: 0 | 1 | 2 | 3;
  mode: PlayMode;
  score: number;
  efficiency?: EfficiencyMetrics | undefined;
  actionTrace?: string | undefined;
  stateHash?: string | undefined;
}

export interface ProgressState {
  progress: Record<string, LevelProgressRecord>;
  hydrated: boolean;
  loadProgress: (db?: TensorcadeDb) => Promise<void>;
  recordAttempt: (levelId: string, worldId: string, db?: TensorcadeDb) => Promise<LevelProgressRecord>;
  recordHintViewed: (
    levelId: string,
    worldId: string,
    tier: 0 | 1 | 2 | 3,
    db?: TensorcadeDb,
  ) => Promise<LevelProgressRecord>;
  recordCompletion: (
    input: RecordCompletionInput,
    db?: TensorcadeDb,
  ) => Promise<LevelProgressRecord>;
  isLevelUnlocked: (levelId: string, prerequisites?: PrerequisitesMap) => boolean;
  resetProgressState: () => void;
}

/**
 * Decoupled DAG prerequisite check.
 * A level is unlocked if it has no prerequisites or all prerequisite levels have at least 1 star or 1 cleared mode.
 */
export function isLevelUnlocked(
  levelId: string,
  progress: Readonly<Record<string, LevelProgressRecord>>,
  prerequisites?: PrerequisitesMap,
): boolean {
  const required = prerequisites?.[levelId];
  if (!required || required.length === 0) {
    return true;
  }
  return required.every((prereqId) => {
    const record = progress[prereqId];
    if (!record) {
      return false;
    }
    return record.starsEarned > 0 || record.clearedModes.length > 0;
  });
}

function createEmptyRecord(levelId: string, worldId: string): LevelProgressRecord {
  return {
    levelId,
    worldId,
    starsEarned: 0,
    clearedModes: [],
    attempts: 0,
    bestScore: 0,
    hintTierReached: 0,
    synced: false,
    updatedAt: Date.now(),
  };
}

async function resolveDb(providedDb?: TensorcadeDb): Promise<TensorcadeDb | undefined> {
  if (providedDb) {
    return providedDb;
  }
  if (typeof indexedDB === 'undefined') {
    return undefined;
  }
  return getSharedTensorcadeDb();
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  progress: {},
  hydrated: false,

  async loadProgress(providedDb?: TensorcadeDb): Promise<void> {
    const db = await resolveDb(providedDb);
    if (!db) {
      set({ hydrated: true });
      return;
    }
    const records = await getAllLevelProgress(db);
    const nextProgress: Record<string, LevelProgressRecord> = {};
    for (const record of records) {
      nextProgress[record.levelId] = record;
    }
    set({ progress: nextProgress, hydrated: true });
  },

  async recordAttempt(
    levelId: string,
    worldId: string,
    providedDb?: TensorcadeDb,
  ): Promise<LevelProgressRecord> {
    const existing = get().progress[levelId] ?? createEmptyRecord(levelId, worldId);
    const incoming: LevelProgressRecord = {
      ...existing,
      worldId: existing.worldId || worldId,
      attempts: existing.attempts + 1,
      synced: false,
      updatedAt: Date.now(),
    };

    const db = await resolveDb(providedDb);
    const merged = db
      ? await mergeLevelProgress(db, incoming)
      : mergeLevelProgressRecords(get().progress[levelId], incoming);

    set((state) => ({
      progress: {
        ...state.progress,
        [levelId]: merged,
      },
    }));
    return merged;
  },

  async recordHintViewed(
    levelId: string,
    worldId: string,
    tier: 0 | 1 | 2 | 3,
    providedDb?: TensorcadeDb,
  ): Promise<LevelProgressRecord> {
    const existing = get().progress[levelId] ?? createEmptyRecord(levelId, worldId);
    const nextTier = (Math.max(existing.hintTierReached, tier) as 0 | 1 | 2 | 3);
    const incoming: LevelProgressRecord = {
      ...existing,
      worldId: existing.worldId || worldId,
      hintTierReached: nextTier,
      synced: false,
      updatedAt: Date.now(),
    };

    const db = await resolveDb(providedDb);
    const merged = db
      ? await mergeLevelProgress(db, incoming)
      : mergeLevelProgressRecords(get().progress[levelId], incoming);

    set((state) => ({
      progress: {
        ...state.progress,
        [levelId]: merged,
      },
    }));
    return merged;
  },

  async recordCompletion(
    input: RecordCompletionInput,
    providedDb?: TensorcadeDb,
  ): Promise<LevelProgressRecord> {
    const existing = get().progress[input.levelId];
    const now = Date.now();
    const incoming: LevelProgressRecord = {
      levelId: input.levelId,
      worldId: input.worldId,
      starsEarned: input.starsEarned,
      clearedModes: input.starsEarned > 0 ? [input.mode] : [],
      attempts: existing?.attempts ?? 1,
      bestScore: input.score,
      bestEfficiency: input.efficiency,
      hintTierReached: existing?.hintTierReached ?? 0,
      bestActionTrace: input.actionTrace,
      stateHash: input.stateHash,
      synced: false,
      updatedAt: now,
    };

    const db = await resolveDb(providedDb);
    const merged = db
      ? await mergeLevelProgress(db, incoming)
      : mergeLevelProgressRecords(existing, incoming);

    if (db) {
      await enqueueSyncItem(db, {
        id: `progress:${input.levelId}:${now}`,
        type: 'progress_upsert',
        payload: {
          levelId: merged.levelId,
          worldId: merged.worldId,
          starsEarned: merged.starsEarned,
          clearedModes: merged.clearedModes,
          bestScore: merged.bestScore,
          updatedAt: merged.updatedAt,
        },
        createdAt: now,
        retryCount: 0,
      });
    }

    set((state) => ({
      progress: {
        ...state.progress,
        [input.levelId]: merged,
      },
    }));
    return merged;
  },

  isLevelUnlocked(levelId: string, prerequisites?: PrerequisitesMap): boolean {
    return isLevelUnlocked(levelId, get().progress, prerequisites);
  },

  resetProgressState(): void {
    set({ progress: {}, hydrated: false });
  },
}));
