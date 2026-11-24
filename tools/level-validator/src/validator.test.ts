import { describe, it, expect, beforeAll } from 'vitest';
import { LevelValidator } from './validator.js';
import type { LevelManifest } from '@tensorcade/levels';

describe('LevelValidator', () => {
  let validator: LevelValidator;

  beforeAll(async () => {
    validator = new LevelValidator();
    await validator.init();
  }, 30000);

  const baseManifest: LevelManifest = {
    schemaVersion: '1.0.0',
    id: 'w1-robot-farm-1.1',
    worldId: 'world-1',
    gameId: 'robot-farm',
    order: 1,
    title: 'First Furrow',
    slug: 'first-furrow',
    learningObjective: 'Navigate forward and harvest crop.',
    conceptTag: 'C_SEQ',
    bloomLevel: 'Apply',
    misconceptionTargeted: 'Sequential flow confusion.',
    difficulty: 'introductory',
    supportedModes: ['explorer', 'builder', 'hacker'],
    estimatedMinutes: 5,
    seeds: [101, 102, 103, 104, 105],
    entrypoint: 'step',
    environmentConfig: {
      width: 4,
      height: 4,
      totalCrops: 1,
    },
    starterCode: { explorer: '', builder: '', hacker: '' },
    referenceSolution: 'step()\nharvest()\n',
    scoringRubric: {
      star1: { description: 'Harvest all crops', condition: 'cropsHarvested == 1' },
      star2: { metric: 'ticks', threshold: 5, description: '< 5 ticks' },
      star3: { hackerOnly: true, noHintsAllowed: true, description: 'Hacker mode' },
    },
    hintLadder: {
      tier1Nudge: 'Move forward into the crop.',
      tier2Concept: 'Commands execute in sequential order.',
      tier3Scaffold: 'step() then harvest()',
    },
  };

  it('validates a correct reference solution across all 5 seeds', async () => {
    const result = await validator.validateLevel(baseManifest);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.seedResults).toHaveLength(5);
    expect(result.seedResults.every((s) => s.success)).toBe(true);
  });

  it('rejects a level with a syntax error in reference solution', async () => {
    const brokenManifest: LevelManifest = {
      ...baseManifest,
      referenceSolution: 'step(\nharvest()\n', // Missing parenthesis syntax error
    };

    const result = await validator.validateLevel(brokenManifest);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes('SyntaxError'))).toBe(true);
  });

  it('rejects a level that fails to meet the victory condition (unsolvable solution)', async () => {
    const incompleteManifest: LevelManifest = {
      ...baseManifest,
      referenceSolution: 'step()\n', // Did not harvest crop!
    };

    const result = await validator.validateLevel(incompleteManifest);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes('Victory condition not met'))).toBe(true);
  });

  it('rejects a reference solution that violates AST constraints', async () => {
    const constrainedManifest: LevelManifest = {
      ...baseManifest,
      astConstraints: {
        bannedTokens: ['for'],
      },
      referenceSolution: 'for _ in range(1):\n    step()\nharvest()\n',
    };

    const result = await validator.validateLevel(constrainedManifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('AST Constraint Violation'))).toBe(true);
  });
});
