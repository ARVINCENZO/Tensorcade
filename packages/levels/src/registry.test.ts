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

  it('lists all 12 registered Robot Farm level manifests in ascending order', async () => {
    const manifests = getAllLevelManifests();
    expect(manifests).toHaveLength(12);
    expect(manifests.map((m) => m.id)).toEqual([
      'w1-robot-farm-1.1',
      'w1-robot-farm-1.2',
      'w1-robot-farm-1.3',
      'w1-robot-farm-1.4',
      'w1-robot-farm-1.5',
      'w1-robot-farm-1.6',
      'w1-robot-farm-1.7',
      'w1-robot-farm-1.8',
      'w1-robot-farm-1.9',
      'w1-robot-farm-1.10',
      'w1-robot-farm-1.11',
      'w1-robot-farm-1.12',
    ]);

    for (const manifest of manifests) {
      const bundle = await loadLevelBundle(manifest.id);
      expect(bundle).toBeDefined();
      const parsed = LevelBundleSchema.safeParse(bundle);
      expect(parsed.success, `Schema check failed for ${manifest.id}`).toBe(true);
      expect(manifest.supportedModes).toEqual(['explorer', 'builder', 'hacker']);
      expect(manifest.seeds).toHaveLength(5);
      expect(manifest.simplificationLabel).toMatch(/^Simplified: /);
      expect(manifest.parsonsBlocks?.filter((b) => b.isDistractor).length).toBeGreaterThanOrEqual(
        2,
      );
      expect(manifest.blocklyToolbox).toBeDefined();
      expect(bundle!.lessonContentMarkdown.length).toBeGreaterThan(100);
    }
  });

  it('resolves sequential next level IDs across 1.1 through 1.12', () => {
    expect(getNextLevelId('w1-robot-farm-1.1')).toBe('w1-robot-farm-1.2');
    expect(getNextLevelId('w1-robot-farm-1.5')).toBe('w1-robot-farm-1.6');
    expect(getNextLevelId('w1-robot-farm-1.11')).toBe('w1-robot-farm-1.12');
    expect(getNextLevelId('w1-robot-farm-1.12')).toBeUndefined();
    expect(getNextLevelId('nonexistent')).toBeUndefined();
  });
});

describe('DAG unlock logic', () => {
  it('unlocks w1-robot-farm-1.1 by default with empty prerequisites', () => {
    expect(LEVEL_PREREQUISITES['w1-robot-farm-1.1']).toEqual([]);
    expect(isLevelUnlocked('w1-robot-farm-1.1', new Set())).toBe(true);
  });

  it('chains w1-robot-farm-1.2 through 1.12 sequentially', () => {
    expect(isLevelUnlocked('w1-robot-farm-1.2', new Set())).toBe(false);
    expect(isLevelUnlocked('w1-robot-farm-1.2', new Set(['w1-robot-farm-1.1']))).toBe(true);

    expect(isLevelUnlocked('w1-robot-farm-1.3', new Set(['w1-robot-farm-1.1']))).toBe(false);
    expect(
      isLevelUnlocked('w1-robot-farm-1.3', new Set(['w1-robot-farm-1.1', 'w1-robot-farm-1.2'])),
    ).toBe(true);

    expect(isLevelUnlocked('w1-robot-farm-1.12', new Set(['w1-robot-farm-1.11']))).toBe(true);
    expect(isLevelUnlocked('w1-robot-farm-1.12', new Set(['w1-robot-farm-1.10']))).toBe(false);
  });

  it('returns false for unknown level IDs', () => {
    expect(isLevelUnlocked('w1-robot-farm-9.9', new Set(['w1-robot-farm-1.1']))).toBe(false);
  });
});
