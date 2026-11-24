import type { LevelBundle } from './schema.js';

type LevelBundleImporter = () => Promise<LevelBundle>;

const LEVEL_LOADERS: ReadonlyMap<string, LevelBundleImporter> = new Map<
  string,
  LevelBundleImporter
>([
  [
    'w1-robot-farm-1.1',
    () => import('./levels/w1-robot-farm-1.1.js').then((mod) => mod.LEVEL_1_1_BUNDLE),
  ],
  [
    'w1-robot-farm-1.2',
    () => import('./levels/w1-robot-farm-1.2.js').then((mod) => mod.LEVEL_1_2_BUNDLE),
  ],
  [
    'w1-robot-farm-1.3',
    () => import('./levels/w1-robot-farm-1.3.js').then((mod) => mod.LEVEL_1_3_BUNDLE),
  ],
  [
    'w1-robot-farm-1.4',
    () => import('./levels/w1-robot-farm-1.4.js').then((mod) => mod.LEVEL_1_4_BUNDLE),
  ],
  [
    'w1-robot-farm-1.5',
    () => import('./levels/w1-robot-farm-1.5.js').then((mod) => mod.LEVEL_1_5_BUNDLE),
  ],
  [
    'w1-robot-farm-1.6',
    () => import('./levels/w1-robot-farm-1.6.js').then((mod) => mod.LEVEL_1_6_BUNDLE),
  ],
  [
    'w1-robot-farm-1.7',
    () => import('./levels/w1-robot-farm-1.7.js').then((mod) => mod.LEVEL_1_7_BUNDLE),
  ],
  [
    'w1-robot-farm-1.8',
    () => import('./levels/w1-robot-farm-1.8.js').then((mod) => mod.LEVEL_1_8_BUNDLE),
  ],
  [
    'w1-robot-farm-1.9',
    () => import('./levels/w1-robot-farm-1.9.js').then((mod) => mod.LEVEL_1_9_BUNDLE),
  ],
  [
    'w1-robot-farm-1.10',
    () => import('./levels/w1-robot-farm-1.10.js').then((mod) => mod.LEVEL_1_10_BUNDLE),
  ],
  [
    'w1-robot-farm-1.11',
    () => import('./levels/w1-robot-farm-1.11.js').then((mod) => mod.LEVEL_1_11_BUNDLE),
  ],
  [
    'w1-robot-farm-1.12',
    () => import('./levels/w1-robot-farm-1.12.js').then((mod) => mod.LEVEL_1_12_BUNDLE),
  ],
]);

/**
 * Dynamically imports a single LevelBundle by ID so Vite/Rollup emits
 * one lazy chunk per level rather than bundling all worlds into the shell.
 */
export async function loadLevelBundle(id: string): Promise<LevelBundle | undefined> {
  const loader = LEVEL_LOADERS.get(id);
  if (!loader) {
    return undefined;
  }
  return loader();
}
