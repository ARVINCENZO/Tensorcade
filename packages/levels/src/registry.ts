import type { LevelBundle, LevelManifest } from './schema.js';
import { LEVEL_1_1_BUNDLE } from './levels/w1-robot-farm-1.1.js';
export { LEVEL_PREREQUISITES, getNextLevelId, isLevelUnlocked } from './dag.js';

const LEVEL_BUNDLES: ReadonlyMap<string, LevelBundle> = new Map<string, LevelBundle>([
  [LEVEL_1_1_BUNDLE.manifest.id, LEVEL_1_1_BUNDLE],
]);

/**
 * Returns the LevelManifest for a registered level ID, or undefined if not found.
 */
export function getLevelManifest(id: string): LevelManifest | undefined {
  return LEVEL_BUNDLES.get(id)?.manifest;
}

/**
 * Returns the LevelBundle for a registered level ID, or undefined if not found.
 */
export function getLevelBundle(id: string): LevelBundle | undefined {
  return LEVEL_BUNDLES.get(id);
}

/**
 * Returns all registered LevelManifests sorted by world order.
 */
export function getAllLevelManifests(): LevelManifest[] {
  return Array.from(LEVEL_BUNDLES.values(), (bundle) => bundle.manifest).sort(
    (a, b) => a.order - b.order,
  );
}
