import type { LevelBundle, LevelManifest } from './schema.js';
import { LEVEL_1_1_BUNDLE } from './levels/w1-robot-farm-1.1.js';
import { LEVEL_1_2_BUNDLE } from './levels/w1-robot-farm-1.2.js';
import { LEVEL_1_3_BUNDLE } from './levels/w1-robot-farm-1.3.js';
import { LEVEL_1_4_BUNDLE } from './levels/w1-robot-farm-1.4.js';
import { LEVEL_1_5_BUNDLE } from './levels/w1-robot-farm-1.5.js';
import { LEVEL_1_6_BUNDLE } from './levels/w1-robot-farm-1.6.js';
import { LEVEL_1_7_BUNDLE } from './levels/w1-robot-farm-1.7.js';
import { LEVEL_1_8_BUNDLE } from './levels/w1-robot-farm-1.8.js';
import { LEVEL_1_9_BUNDLE } from './levels/w1-robot-farm-1.9.js';
import { LEVEL_1_10_BUNDLE } from './levels/w1-robot-farm-1.10.js';
import { LEVEL_1_11_BUNDLE } from './levels/w1-robot-farm-1.11.js';
import { LEVEL_1_12_BUNDLE } from './levels/w1-robot-farm-1.12.js';
export { LEVEL_PREREQUISITES, getNextLevelId, isLevelUnlocked } from './dag.js';

const ALL_BUNDLES: ReadonlyArray<LevelBundle> = [
  LEVEL_1_1_BUNDLE,
  LEVEL_1_2_BUNDLE,
  LEVEL_1_3_BUNDLE,
  LEVEL_1_4_BUNDLE,
  LEVEL_1_5_BUNDLE,
  LEVEL_1_6_BUNDLE,
  LEVEL_1_7_BUNDLE,
  LEVEL_1_8_BUNDLE,
  LEVEL_1_9_BUNDLE,
  LEVEL_1_10_BUNDLE,
  LEVEL_1_11_BUNDLE,
  LEVEL_1_12_BUNDLE,
];

const LEVEL_BUNDLES: ReadonlyMap<string, LevelBundle> = new Map<string, LevelBundle>(
  ALL_BUNDLES.map((bundle) => [bundle.manifest.id, bundle]),
);

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
