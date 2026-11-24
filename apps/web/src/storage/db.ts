import { openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction, type StoreNames } from 'idb';
import type { PlayMode } from '@tensorcade/contracts';

export const TENSORCADE_DB_NAME = 'tensorcade_local_v1';
export const TENSORCADE_DB_VERSION = 1;
export const DEFAULT_USER_PROFILE_ID = 'guest';

export type ThemeMode = 'dark' | 'high-contrast';

export interface UserSettings {
  theme: ThemeMode;
  reducedMotion: boolean;
  lowSpecMode: boolean;
  acousticTelemetry: boolean;
  preferredMode: PlayMode;
  consentAnalytics: boolean | null;
}

export interface UserProfileRecord {
  id: string;
  username: string;
  settings: UserSettings;
  updatedAt: number;
}

export interface EfficiencyMetrics {
  ticks?: number | undefined;
  memoryBytes?: number | undefined;
  promptTokens?: number | undefined;
  [key: string]: number | undefined;
}

export interface LevelProgressRecord {
  levelId: string;
  worldId: string;
  starsEarned: 0 | 1 | 2 | 3;
  clearedModes: PlayMode[];
  attempts: number;
  bestScore: number;
  bestEfficiency?: EfficiencyMetrics | undefined;
  hintTierReached: 0 | 1 | 2 | 3;
  bestActionTrace?: string | undefined;
  stateHash?: string | undefined;
  synced: boolean;
  updatedAt: number;
}

export type SyncQueueItemType = 'progress_upsert' | 'trace_verify';

export interface SyncQueueItem {
  id: string;
  type: SyncQueueItemType;
  payload: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
  lastAttemptAt?: number | undefined;
}

export interface CodeSnapshotRecord {
  id: string;
  levelId: string;
  mode: PlayMode;
  code: string;
  updatedAt: number;
}

export interface TensorcadeDbSchema extends DBSchema {
  user_profile: {
    key: string;
    value: UserProfileRecord;
  };
  level_progress: {
    key: string;
    value: LevelProgressRecord;
    indexes: {
      'by-world': string;
      'by-updatedAt': number;
    };
  };
  sync_queue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-createdAt': number;
    };
  };
  code_snapshots: {
    key: string;
    value: CodeSnapshotRecord;
    indexes: {
      'by-level': string;
    };
  };
}

export type TensorcadeDb = IDBPDatabase<TensorcadeDbSchema>;

export interface OpenTensorcadeDbOptions {
  dbName?: string | undefined;
  version?: number | undefined;
  onUpgrade?: ((
    db: TensorcadeDb,
    oldVersion: number,
    newVersion: number | null,
    transaction: IDBPTransaction<TensorcadeDbSchema, StoreNames<TensorcadeDbSchema>[], 'versionchange'>,
  ) => void) | undefined;
}

/**
 * Applies versioned IndexedDB schema migrations cleanly without data loss.
 * Supports v1 (user_profile, level_progress, sync_queue) and v2 (code_snapshots + updatedAt index).
 */
export function upgradeTensorcadeDb(
  db: TensorcadeDb,
  oldVersion: number,
  newVersion: number | null,
  transaction: IDBPTransaction<TensorcadeDbSchema, StoreNames<TensorcadeDbSchema>[], 'versionchange'>,
): void {
  const targetVersion = newVersion ?? TENSORCADE_DB_VERSION;

  if (oldVersion < 1 && targetVersion >= 1) {
    if (!db.objectStoreNames.contains('user_profile')) {
      db.createObjectStore('user_profile', { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains('level_progress')) {
      const progressStore = db.createObjectStore('level_progress', { keyPath: 'levelId' });
      progressStore.createIndex('by-world', 'worldId', { unique: false });
    }
    if (!db.objectStoreNames.contains('sync_queue')) {
      const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
      syncStore.createIndex('by-createdAt', 'createdAt', { unique: false });
    }
  }

  if (oldVersion < 2 && targetVersion >= 2) {
    if (db.objectStoreNames.contains('level_progress')) {
      const progressStore = transaction.objectStore('level_progress');
      if (!progressStore.indexNames.contains('by-updatedAt')) {
        progressStore.createIndex('by-updatedAt', 'updatedAt', { unique: false });
      }
    }
    if (!db.objectStoreNames.contains('code_snapshots')) {
      const snapshotStore = db.createObjectStore('code_snapshots', { keyPath: 'id' });
      snapshotStore.createIndex('by-level', 'levelId', { unique: false });
    }
  }
}

/**
 * Opens the local-first Tensorcade IndexedDB database with versioned schema migrations.
 */
export async function openTensorcadeDb(
  options: OpenTensorcadeDbOptions = {},
): Promise<TensorcadeDb> {
  const dbName = options.dbName ?? TENSORCADE_DB_NAME;
  const version = options.version ?? TENSORCADE_DB_VERSION;

  return openDB<TensorcadeDbSchema>(dbName, version, {
    upgrade(db, oldVersion, newVersion, transaction) {
      upgradeTensorcadeDb(db, oldVersion, newVersion, transaction);
      if (options.onUpgrade) {
        options.onUpgrade(db, oldVersion, newVersion, transaction);
      }
    },
  });
}

let sharedDbPromise: Promise<TensorcadeDb> | null = null;
let sharedDbInstance: TensorcadeDb | null = null;

/**
 * Returns a single shared IndexedDB handle for the default database,
 * releasing the handle cleanly on `blocking` / `terminated` events so schema
 * upgrades never stall and long sessions do not accumulate open handles.
 */
export async function getSharedTensorcadeDb(): Promise<TensorcadeDb> {
  if (sharedDbInstance) {
    return sharedDbInstance;
  }
  if (!sharedDbPromise) {
    sharedDbPromise = openDB<TensorcadeDbSchema>(TENSORCADE_DB_NAME, TENSORCADE_DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        upgradeTensorcadeDb(db, oldVersion, newVersion, transaction);
      },
      blocking() {
        const current = sharedDbInstance;
        sharedDbInstance = null;
        sharedDbPromise = null;
        current?.close();
      },
      terminated() {
        sharedDbInstance = null;
        sharedDbPromise = null;
      },
    })
      .then((db) => {
        sharedDbInstance = db;
        return db;
      })
      .catch((err: unknown) => {
        sharedDbInstance = null;
        sharedDbPromise = null;
        throw err;
      });
  }
  return sharedDbPromise;
}

export async function closeSharedTensorcadeDb(): Promise<void> {
  const pending = sharedDbPromise;
  sharedDbPromise = null;
  const db = sharedDbInstance ?? (pending ? await pending.catch(() => null) : null);
  sharedDbInstance = null;
  db?.close();
}

/**
 * Pure monotonic merge for level progress records:
 * - starsEarned: max(local, incoming)
 * - clearedModes: union of both arrays
 * - bestScore: max(local, incoming)
 * - hintTierReached: max(local, incoming)
 * - attempts: max(local, incoming)
 * - bestActionTrace / bestEfficiency / stateHash: retained from higher stars, or lower ticks on tie
 */
export function mergeLevelProgressRecords(
  local: LevelProgressRecord | undefined,
  incoming: LevelProgressRecord,
): LevelProgressRecord {
  if (!local) {
    return {
      ...incoming,
      clearedModes: Array.from(new Set(incoming.clearedModes)),
    };
  }

  const starsEarned = (Math.max(local.starsEarned, incoming.starsEarned) as 0 | 1 | 2 | 3);
  const clearedModes = Array.from(new Set<PlayMode>([...local.clearedModes, ...incoming.clearedModes]));
  const bestScore = Math.max(local.bestScore, incoming.bestScore);
  const hintTierReached = (Math.max(local.hintTierReached, incoming.hintTierReached) as 0 | 1 | 2 | 3);
  const attempts = Math.max(local.attempts, incoming.attempts);
  const updatedAt = Math.max(local.updatedAt, incoming.updatedAt);

  let preferIncoming = incoming.starsEarned > local.starsEarned;
  if (incoming.starsEarned === local.starsEarned) {
    const localTicks = local.bestEfficiency?.ticks;
    const incomingTicks = incoming.bestEfficiency?.ticks;
    if (incomingTicks !== undefined && (localTicks === undefined || incomingTicks < localTicks)) {
      preferIncoming = true;
    } else if (incoming.bestScore > local.bestScore && localTicks === incomingTicks) {
      preferIncoming = true;
    }
  }

  const primary = preferIncoming ? incoming : local;
  const fallback = preferIncoming ? local : incoming;

  return {
    levelId: incoming.levelId,
    worldId: incoming.worldId || local.worldId,
    starsEarned,
    clearedModes,
    attempts,
    bestScore,
    bestEfficiency: primary.bestEfficiency ?? fallback.bestEfficiency,
    hintTierReached,
    bestActionTrace: primary.bestActionTrace ?? fallback.bestActionTrace,
    stateHash: primary.stateHash ?? fallback.stateHash,
    synced: local.synced && incoming.synced,
    updatedAt,
  };
}

export async function getUserProfile(
  db: TensorcadeDb,
  id: string = DEFAULT_USER_PROFILE_ID,
): Promise<UserProfileRecord | undefined> {
  return db.get('user_profile', id);
}

export async function putUserProfile(
  db: TensorcadeDb,
  profile: UserProfileRecord,
): Promise<string> {
  return db.put('user_profile', profile);
}

export async function getLevelProgress(
  db: TensorcadeDb,
  levelId: string,
): Promise<LevelProgressRecord | undefined> {
  return db.get('level_progress', levelId);
}

export async function getAllLevelProgress(
  db: TensorcadeDb,
): Promise<LevelProgressRecord[]> {
  return db.getAll('level_progress');
}

export async function putLevelProgress(
  db: TensorcadeDb,
  record: LevelProgressRecord,
): Promise<string> {
  return db.put('level_progress', record);
}

export async function mergeLevelProgress(
  db: TensorcadeDb,
  incoming: LevelProgressRecord,
): Promise<LevelProgressRecord> {
  const tx = db.transaction('level_progress', 'readwrite');
  const existing = await tx.store.get(incoming.levelId);
  const merged = mergeLevelProgressRecords(existing, incoming);
  await tx.store.put(merged);
  await tx.done;
  return merged;
}

export async function enqueueSyncItem(
  db: TensorcadeDb,
  item: SyncQueueItem,
): Promise<string> {
  return db.put('sync_queue', item);
}

export async function getPendingSyncItems(
  db: TensorcadeDb,
): Promise<SyncQueueItem[]> {
  return db.getAllFromIndex('sync_queue', 'by-createdAt');
}

export async function removeSyncItem(
  db: TensorcadeDb,
  id: string,
): Promise<void> {
  await db.delete('sync_queue', id);
}

export async function clearSyncQueue(db: TensorcadeDb): Promise<void> {
  await db.clear('sync_queue');
}
