import { describe, expect, it } from 'vitest';
import { LevelBundleSchema } from './schema.js';
import { LEVEL_1_1_BUNDLE, LEVEL_1_1_MANIFEST } from './levels/w1-robot-farm-1.1.js';
import {
  LEVEL_PREREQUISITES,
  getAllLevelManifests,
  getLevelBundle,
  getLevelManifest,
  getNextLevelId,
  isLevelUnlocked,
  loadLevelBundle,
} from './index.js';

describe('LEVEL_1_1_BUNDLE', () => {
  it('validates against LevelBundleSchema', () => {
    const parsed = LevelBundleSchema.safeParse(LEVEL_1_1_BUNDLE);
    expect(parsed.success).toBe(true);
  });

  it('includes required Robot Farm 1.1 metadata, seeds, rubric, hints, and parsons distractors', () => {
    expect(LEVEL_1_1_MANIFEST.id).toBe('w1-robot-farm-1.1');
    expect(LEVEL_1_1_MANIFEST.title).toBe('First Furrow');
    expect(LEVEL_1_1_MANIFEST.simplificationLabel).toBe(
      'Simplified: Robot Farm uses discrete 2D grid ticks instead of continuous physics.',
    );
    expect(LEVEL_1_1_MANIFEST.seeds).toEqual([10001, 10002, 10003, 10004, 10005]);
    expect(LEVEL_1_1_MANIFEST.supportedModes).toEqual(['explorer', 'builder', 'hacker']);
    expect(LEVEL_1_1_MANIFEST.parsonsBlocks?.some((b) => b.isDistractor)).toBe(true);
    expect(LEVEL_1_1_MANIFEST.scoringRubric.star3.hackerOnly).toBe(true);
    expect(LEVEL_1_1_MANIFEST.scoringRubric.star3.noHintsAllowed).toBe(true);
    expect(LEVEL_1_1_BUNDLE.lessonContentMarkdown).toContain('sequential');
  });
});

describe('level registry', () => {
  it('looks up manifests and bundles by level ID', async () => {
    expect(getLevelManifest('w1-robot-farm-1.1')).toEqual(LEVEL_1_1_MANIFEST);
    expect(getLevelBundle('w1-robot-farm-1.1')).toEqual(LEVEL_1_1_BUNDLE);
    expect(await loadLevelBundle('w1-robot-farm-1.1')).toEqual(LEVEL_1_1_BUNDLE);
    expect(getLevelManifest('unknown-level')).toBeUndefined();
    expect(getLevelBundle('unknown-level')).toBeUndefined();
    expect(await loadLevelBundle('unknown-level')).toBeUndefined();
  });

  it('lists all registered level manifests', () => {
    const manifests = getAllLevelManifests();
    expect(manifests).toHaveLength(1);
    expect(manifests[0]?.id).toBe('w1-robot-farm-1.1');
  });

  it('resolves sequential next level IDs', () => {
    expect(getNextLevelId('w1-robot-farm-1.1')).toBe('w1-robot-farm-1.2');
    expect(getNextLevelId('w1-robot-farm-1.2')).toBe('w1-robot-farm-1.3');
    expect(getNextLevelId('w1-robot-farm-1.4')).toBe('w1-robot-farm-1.5');
    expect(getNextLevelId('w1-robot-farm-1.5')).toBeUndefined();
    expect(getNextLevelId('nonexistent')).toBeUndefined();
  });
});

describe('DAG unlock logic', () => {
  it('unlocks w1-robot-farm-1.1 by default with empty prerequisites', () => {
    expect(LEVEL_PREREQUISITES['w1-robot-farm-1.1']).toEqual([]);
    expect(isLevelUnlocked('w1-robot-farm-1.1', new Set())).toBe(true);
  });

  it('chains w1-robot-farm-1.2 through 1.5 sequentially', () => {
    expect(isLevelUnlocked('w1-robot-farm-1.2', new Set())).toBe(false);
    expect(isLevelUnlocked('w1-robot-farm-1.2', new Set(['w1-robot-farm-1.1']))).toBe(true);

    expect(isLevelUnlocked('w1-robot-farm-1.3', new Set(['w1-robot-farm-1.1']))).toBe(false);
    expect(
      isLevelUnlocked('w1-robot-farm-1.3', new Set(['w1-robot-farm-1.1', 'w1-robot-farm-1.2'])),
    ).toBe(true);

    expect(isLevelUnlocked('w1-robot-farm-1.5', new Set(['w1-robot-farm-1.4']))).toBe(true);
    expect(isLevelUnlocked('w1-robot-farm-1.5', new Set(['w1-robot-farm-1.3']))).toBe(false);
  });

  it('returns false for unknown level IDs', () => {
    expect(isLevelUnlocked('w1-robot-farm-9.9', new Set(['w1-robot-farm-1.1']))).toBe(false);
  });
});
