import { create } from 'zustand';
import type { PlayMode } from '@tensorcade/contracts';
import {
  DEFAULT_USER_PROFILE_ID,
  getSharedTensorcadeDb,
  getUserProfile,
  putUserProfile,
  type TensorcadeDb,
  type ThemeMode,
  type UserProfileRecord,
  type UserSettings,
} from './db.js';

export function detectSystemReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function createDefaultSettings(): UserSettings {
  return {
    theme: 'dark',
    reducedMotion: detectSystemReducedMotion(),
    lowSpecMode: false,
    acousticTelemetry: false,
    preferredMode: 'explorer',
    consentAnalytics: null,
  };
}

export interface SettingsState extends UserSettings {
  hydrated: boolean;
  loadSettings: (db?: TensorcadeDb) => Promise<void>;
  setTheme: (theme: ThemeMode, db?: TensorcadeDb) => Promise<void>;
  setReducedMotion: (reducedMotion: boolean, db?: TensorcadeDb) => Promise<void>;
  setLowSpecMode: (lowSpecMode: boolean, db?: TensorcadeDb) => Promise<void>;
  setAcousticTelemetry: (acousticTelemetry: boolean, db?: TensorcadeDb) => Promise<void>;
  setPreferredMode: (preferredMode: PlayMode, db?: TensorcadeDb) => Promise<void>;
  setConsentAnalytics: (consentAnalytics: boolean | null, db?: TensorcadeDb) => Promise<void>;
  resetSettings: (db?: TensorcadeDb) => Promise<void>;
}

function extractSettings(state: SettingsState): UserSettings {
  return {
    theme: state.theme,
    reducedMotion: state.reducedMotion,
    lowSpecMode: state.lowSpecMode,
    acousticTelemetry: state.acousticTelemetry,
    preferredMode: state.preferredMode,
    consentAnalytics: state.consentAnalytics,
  };
}

function syncDomAttributes(settings: UserSettings): void {
  if (typeof document === 'undefined' || !document.documentElement) {
    return;
  }
  document.documentElement.dataset['theme'] = settings.theme;
  document.documentElement.dataset['reducedMotion'] = String(settings.reducedMotion);
}

async function persistSettings(settings: UserSettings, providedDb?: TensorcadeDb): Promise<void> {
  if (!providedDb && typeof indexedDB === 'undefined') {
    return;
  }
  const db = providedDb ?? (await getSharedTensorcadeDb());
  const existing = await getUserProfile(db, DEFAULT_USER_PROFILE_ID);
  const record: UserProfileRecord = {
    id: existing?.id ?? DEFAULT_USER_PROFILE_ID,
    username: existing?.username ?? 'guest',
    settings,
    updatedAt: Date.now(),
  };
  await putUserProfile(db, record);
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const initial = createDefaultSettings();

  const updateAndPersist = async (
    patch: Partial<UserSettings>,
    providedDb?: TensorcadeDb,
  ): Promise<void> => {
    const nextSettings: UserSettings = {
      ...extractSettings(get()),
      ...patch,
    };
    set(nextSettings);
    syncDomAttributes(nextSettings);
    await persistSettings(nextSettings, providedDb);
  };

  return {
    ...initial,
    hydrated: false,

    async loadSettings(providedDb?: TensorcadeDb): Promise<void> {
      if (!providedDb && typeof indexedDB === 'undefined') {
        set({ hydrated: true });
        return;
      }
      const db = providedDb ?? (await getSharedTensorcadeDb());
      const profile = await getUserProfile(db, DEFAULT_USER_PROFILE_ID);
      if (profile) {
        const merged: UserSettings = {
          ...createDefaultSettings(),
          ...profile.settings,
        };
        set({ ...merged, hydrated: true });
        syncDomAttributes(merged);
      } else {
        const defaults = createDefaultSettings();
        set({ ...defaults, hydrated: true });
        syncDomAttributes(defaults);
      }
    },

    setTheme: (theme, db) => updateAndPersist({ theme }, db),
    setReducedMotion: (reducedMotion, db) => updateAndPersist({ reducedMotion }, db),
    setLowSpecMode: (lowSpecMode, db) => updateAndPersist({ lowSpecMode }, db),
    setAcousticTelemetry: (acousticTelemetry, db) => updateAndPersist({ acousticTelemetry }, db),
    setPreferredMode: (preferredMode, db) => updateAndPersist({ preferredMode }, db),
    setConsentAnalytics: (consentAnalytics, db) => updateAndPersist({ consentAnalytics }, db),

    async resetSettings(providedDb?: TensorcadeDb): Promise<void> {
      const defaults = createDefaultSettings();
      set({ ...defaults, hydrated: true });
      syncDomAttributes(defaults);
      await persistSettings(defaults, providedDb);
    },
  };
});
