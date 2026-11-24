import { describe, expect, it } from 'vitest';
import { LevelBundleSchema, LevelManifestSchema } from './schema.js';

describe('LevelManifestSchema', () => {
  const validManifest = {
    schemaVersion: '1.0.0',
    id: 'w3-blind-mountaineer-3.1',
    worldId: 'world-3',
    gameId: 'blind-mountaineer',
    order: 1,
    title: 'Downhill Instinct',
    slug: 'downhill-instinct',
    learningObjective: 'Calculate negative gradient update and apply learning rate scaling in 1D.',
    conceptTag: 'C_GRAD',
    bloomLevel: 'Apply',
    misconceptionTargeted:
      'Gradient direction confusion: moving along the gradient rather than the negative gradient.',
    simplificationLabel: 'Simplified: 1D parabola loss surface without momentum or noise.',
    difficulty: 'introductory',
    supportedModes: ['explorer', 'builder', 'hacker'],
    estimatedMinutes: 8,
    seeds: [104729, 224737, 350377, 499979, 611953],
    environmentConfig: {
      dimensions: 1,
      surfaceType: 'quadratic',
    },
    starterCode: {
      explorer: '',
      builder: '',
      hacker: 'def step(current_w: float, grad: float, lr: float) -> float:\n    pass\n',
    },
    referenceSolution:
      'def step(current_w: float, grad: float, lr: float) -> float:\n    return current_w - (lr * grad)\n',
    scoringRubric: {
      star1: {
        description: 'Converge within threshold',
        condition: 'final_loss < 0.001',
      },
      star2: {
        description: 'Complete in under 25 iterations',
        metric: 'iterations',
        threshold: 25,
      },
      star3: {
        description: 'Hacker mode without hints',
        hackerOnly: true,
        noHintsAllowed: true,
      },
    },
    hintLadder: {
      tier1Nudge: 'Think about which direction decreases the loss function.',
      tier2Concept: 'The gradient vector points in the direction of steepest ascent.',
      tier3Scaffold: 'Subtract the scaled gradient: current_w - (lr * grad).',
    },
  };

  it('successfully parses a valid manifest and sets default entrypoint', () => {
    const parsed = LevelManifestSchema.parse(validManifest);
    expect(parsed.entrypoint).toBe('step');
    expect(parsed.id).toBe('w3-blind-mountaineer-3.1');
    expect(parsed.seeds).toHaveLength(5);
  });

  it('accepts explicit entrypoint', () => {
    const parsed = LevelManifestSchema.parse({
      ...validManifest,
      entrypoint: 'custom_solve',
    });
    expect(parsed.entrypoint).toBe('custom_solve');
  });

  it('supports hyphenated world and game IDs in level id regex', () => {
    const manifest1 = { ...validManifest, id: 'w1-farm-1.1' };
    const manifest2 = { ...validManifest, id: 'world-1-game-2.3' };
    const manifest3 = { ...validManifest, id: 'w5-deep-q-network-5.12' };

    expect(LevelManifestSchema.parse(manifest1).id).toBe('w1-farm-1.1');
    expect(LevelManifestSchema.parse(manifest2).id).toBe('world-1-game-2.3');
    expect(LevelManifestSchema.parse(manifest3).id).toBe('w5-deep-q-network-5.12');
  });

  it('rejects manifest with fewer than 5 seeds', () => {
    const invalid = {
      ...validManifest,
      seeds: [104729, 224737, 350377, 499979],
    };
    expect(() => LevelManifestSchema.parse(invalid)).toThrow(
      'Every level must specify exactly 5 evaluation seeds for anti-guessing',
    );
  });

  it('rejects manifest with more than 5 seeds', () => {
    const invalid = {
      ...validManifest,
      seeds: [104729, 224737, 350377, 499979, 611953, 777777],
    };
    expect(() => LevelManifestSchema.parse(invalid)).toThrow(
      'Every level must specify exactly 5 evaluation seeds for anti-guessing',
    );
  });

  it('rejects invalid level ID format', () => {
    expect(() => LevelManifestSchema.parse({ ...validManifest, id: 'INVALID_ID' })).toThrow();
    expect(() => LevelManifestSchema.parse({ ...validManifest, id: 'w1-farm' })).toThrow();
  });

  it('rejects invalid bloom taxonomy level', () => {
    expect(() => LevelManifestSchema.parse({ ...validManifest, bloomLevel: 'Memorize' })).toThrow();
  });

  it('validates a complete LevelBundle', () => {
    const bundle = {
      manifest: validManifest,
      lessonContentMarkdown: '# Downhill Instinct\nLearn how gradient descent works.',
    };
    const parsed = LevelBundleSchema.parse(bundle);
    expect(parsed.manifest.title).toBe('Downhill Instinct');
    expect(parsed.lessonContentMarkdown).toContain('gradient descent');
  });
});
