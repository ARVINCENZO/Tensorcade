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
