import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LevelValidator } from './validator.js';
import { getAllLevelManifests, type LevelManifest } from '@tensorcade/levels';

interface GoldenFixtureFile {
  schemaVersion: string;
  worldId: string;
  gameId: string;
  pyodideVersion: string;
  entries: Array<{
    levelId: string;
    seed: number;
    totalTicks: number;
    terminalHash: string;
    cropsHarvested: number;
    totalCrops: number;
  }>;
}

/**
 * Expected Builder Mode (Parsons) indentation plan for each Robot Farm level's non-distractor blocks.
 * Proves that every single level is solvable via its published parsonsBlocks within 0/4/8/12 spaces.
 */
const BUILDER_INDENT_PLANS: Record<string, ReadonlyArray<{ id: string; indent: number }>> = {
  'w1-robot-farm-1.1': [
    { id: 'b1', indent: 0 },
    { id: 'b2', indent: 0 },
  ],
  'w1-robot-farm-1.2': [
    { id: 'b1', indent: 0 },
    { id: 'b2', indent: 0 },
    { id: 'b3', indent: 0 },
    { id: 'b4', indent: 0 },
    { id: 'b5', indent: 0 },
    { id: 'b6', indent: 0 },
  ],
  'w1-robot-farm-1.3': [
    { id: 'b1', indent: 0 },
    { id: 'b2', indent: 4 },
    { id: 'b3', indent: 4 },
  ],
  'w1-robot-farm-1.4': [
    { id: 'b1', indent: 0 },
    { id: 'b2', indent: 0 },
    { id: 'b3', indent: 4 },
    { id: 'b4', indent: 4 },
    { id: 'b5', indent: 4 },
  ],
  'w1-robot-farm-1.5': [
    { id: 'b1', indent: 0 },
    { id: 'b2', indent: 4 },
    { id: 'b3', indent: 4 },
    { id: 'b4', indent: 8 },
  ],
  'w1-robot-farm-1.6': [
    { id: 'b1', indent: 0 },
    { id: 'b2', indent: 4 },
    { id: 'b3', indent: 8 },
    { id: 'b4', indent: 8 },
    { id: 'b5', indent: 12 },
    { id: 'b6', indent: 4 },
    { id: 'b7', indent: 8 },
  ],
  'w1-robot-farm-1.7': [
    { id: 'b1', indent: 0 },
    { id: 'b2', indent: 4 },
    { id: 'b3', indent: 8 },
    { id: 'b4', indent: 4 },
    { id: 'b5', indent: 8 },
    { id: 'b6', indent: 4 },
    { id: 'b7', indent: 8 },
    { id: 'b8', indent: 8 },
    { id: 'b9', indent: 12 },
  ],
  'w1-robot-farm-1.8': [
    { id: 'b1', indent: 0 },
    { id: 'b2', indent: 4 },
    { id: 'b3', indent: 8 },
    { id: 'b4', indent: 4 },
    { id: 'b5', indent: 8 },
    { id: 'b6', indent: 4 },
    { id: 'b7', indent: 8 },
  ],
  'w1-robot-farm-1.9': [
    { id: 'b1', indent: 0 },
    { id: 'b2', indent: 4 },
    { id: 'b3', indent: 8 },
    { id: 'b4', indent: 4 },
    { id: 'b5', indent: 8 },
    { id: 'b6', indent: 4 },
    { id: 'b7', indent: 8 },
    { id: 'b8', indent: 4 },
    { id: 'b9', indent: 8 },
  ],
  'w1-robot-farm-1.10': [
    { id: 'b1', indent: 0 },
    { id: 'b2', indent: 0 },
    { id: 'b3', indent: 4 },
    { id: 'b4', indent: 4 },
    { id: 'b5', indent: 8 },
    { id: 'b6', indent: 8 },
    { id: 'b7', indent: 4 },
    { id: 'b8', indent: 4 },
    { id: 'b9', indent: 8 },
    { id: 'b10', indent: 4 },
    { id: 'b11', indent: 8 },
  ],
  'w1-robot-farm-1.11': [
    { id: 'b1', indent: 0 },
    { id: 'b2', indent: 4 },
    { id: 'b3', indent: 4 },
    { id: 'b4', indent: 8 },
    { id: 'b5', indent: 8 },
    { id: 'b6', indent: 12 },
    { id: 'b7', indent: 4 },
    { id: 'b8', indent: 4 },
    { id: 'b9', indent: 8 },
    { id: 'b10', indent: 4 },
    { id: 'b11', indent: 0 },
    { id: 'b12', indent: 0 },
    { id: 'b13', indent: 4 },
    { id: 'b14', indent: 4 },
    { id: 'b15', indent: 8 },
  ],
  'w1-robot-farm-1.12': [
    { id: 'b1', indent: 0 },
    { id: 'b2', indent: 4 },
    { id: 'b3', indent: 8 },
    { id: 'b4', indent: 8 },
    { id: 'b5', indent: 12 },
    { id: 'b6', indent: 4 },
    { id: 'b7', indent: 4 },
    { id: 'b8', indent: 8 },
    { id: 'b9', indent: 0 },
    { id: 'b10', indent: 4 },
    { id: 'b11', indent: 4 },
    { id: 'b12', indent: 8 },
    { id: 'b13', indent: 0 },
    { id: 'b14', indent: 0 },
    { id: 'b15', indent: 4 },
    { id: 'b16', indent: 4 },
    { id: 'b17', indent: 8 },
  ],
};

function assembleFromParsons(
  manifest: LevelManifest,
  plan: ReadonlyArray<{ id: string; indent: number }>,
): string {
  const byId = new Map((manifest.parsonsBlocks ?? []).map((b) => [b.id, b]));
  const lines: string[] = [];
  for (const step of plan) {
    const block = byId.get(step.id);
    if (!block || block.isDistractor) {
      throw new Error(`Invalid non-distractor block ${step.id} in ${manifest.id}`);
    }
    const pad = ' '.repeat(step.indent);
    for (const rawLine of block.code.split('\n')) {
      lines.push(rawLine.trim().length === 0 ? '' : `${pad}${rawLine}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

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
      referenceSolution: 'step(\nharvest()\n',
    };

    const result = await validator.validateLevel(brokenManifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('SyntaxError'))).toBe(true);
  });

  it('rejects a level that fails to meet the victory condition (unsolvable solution)', async () => {
    const incompleteManifest: LevelManifest = {
      ...baseManifest,
      referenceSolution: 'step()\n',
    };

    const result = await validator.validateLevel(incompleteManifest);
    expect(result.valid).toBe(false);
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

  it('validates all 12 Robot Farm levels across 60 seeds and matches golden parity hashes', async () => {
    const fixturePath = resolve(
      import.meta.dirname,
      '../../../packages/levels/fixtures/world-1/robot-farm-golden.json',
    );
    const golden = JSON.parse(readFileSync(fixturePath, 'utf8')) as GoldenFixtureFile;
    const manifests = getAllLevelManifests().filter((m) => m.gameId === 'robot-farm');

    expect(manifests).toHaveLength(12);
    expect(golden.entries).toHaveLength(60);

    const goldenByKey = new Map(golden.entries.map((e) => [`${e.levelId}:${e.seed}`, e]));

    for (const manifest of manifests) {
      const result = await validator.validateLevel(manifest);
      expect(result.valid, `${manifest.id} errors: ${result.errors.join('; ')}`).toBe(true);
      expect(result.seedResults).toHaveLength(5);

      const distinctHashes = new Set<string>();
      for (const sr of result.seedResults) {
        expect(sr.success).toBe(true);
        const expected = goldenByKey.get(`${manifest.id}:${sr.seed}`);
        expect(expected, `Missing golden entry for ${manifest.id}:${sr.seed}`).toBeDefined();
        expect(sr.terminalHash).toBe(expected!.terminalHash);
        expect(sr.totalTicks).toBe(expected!.totalTicks);
        expect(sr.cropsHarvested).toBe(expected!.cropsHarvested);
        expect(sr.totalCrops).toBe(expected!.totalCrops);
        distinctHashes.add(sr.terminalHash!);
      }

      // Every level's 5 seeds must produce distinct terminal states (anti-memorization)
      expect(distinctHashes.size).toBeGreaterThanOrEqual(4);
    }
  }, 60000);

  it('proves Builder (Parsons) non-distractor blocks solve all 12 Robot Farm levels across 5 seeds', async () => {
    const manifests = getAllLevelManifests().filter((m) => m.gameId === 'robot-farm');
    for (const manifest of manifests) {
      const plan = BUILDER_INDENT_PLANS[manifest.id];
      expect(plan, `Missing Builder indent plan for ${manifest.id}`).toBeDefined();
      const assembledCode = assembleFromParsons(manifest, plan!);
      const result = await validator.validateLevel({
        ...manifest,
        referenceSolution: assembledCode,
      });
      expect(
        result.valid,
        `Builder solution failed for ${manifest.id}: ${result.errors.join('; ')}`,
      ).toBe(true);
    }
  }, 60000);

  it('rejects hardcoded / misconception solutions across Robot Farm levels (anti-guessing proofs)', async () => {
    const byId = new Map(getAllLevelManifests().map((m) => [m.id, m]));

    const badSubmissions: ReadonlyArray<{ levelId: string; code: string; label: string }> = [
      { levelId: 'w1-robot-farm-1.1', code: 'harvest()\nstep()\n', label: 'reversed sequence' },
      {
        levelId: 'w1-robot-farm-1.2',
        code: 'step()\nstep()\nturn_left()\nstep()\nstep()\nharvest()\n',
        label: 'wrong left turn',
      },
      {
        levelId: 'w1-robot-farm-1.3',
        code: 'for _ in range(5):\n    step()\n    harvest()\n',
        label: 'hardcoded row count 5',
      },
      {
        levelId: 'w1-robot-farm-1.4',
        code: 'for _ in range(get_row_length()):\n    step()\n    harvest()\n',
        label: 'blind harvest depletes battery',
      },
      {
        levelId: 'w1-robot-farm-1.5',
        code: 'for _ in range(get_row_length()):\n    step()\n    harvest()\n',
        label: 'unguarded harvest without if',
      },
      {
        levelId: 'w1-robot-farm-1.6',
        code: 'for _ in range(get_row_length()):\n    step()\n',
        label: 'ignores rocks without if/else',
      },
      {
        levelId: 'w1-robot-farm-1.7',
        code: 'for _ in range(get_row_length()):\n    if is_front_clear():\n        step()\n    else:\n        turn_right()\n',
        label: 'turns right on ravines (no elif triage)',
      },
      {
        levelId: 'w1-robot-farm-1.8',
        code: 'for _ in range(15):\n    if is_front_clear():\n        step()\n    else:\n        turn_right()\n',
        label: 'for loop banned on shifting perimeter',
      },
      {
        levelId: 'w1-robot-farm-1.9',
        code: 'while has_energy() and not is_field_cleared():\n    if is_front_clear():\n        step()\n    else:\n        turn_right()\n    if can_harvest():\n        harvest()\n',
        label: 'skips recharge on battery relay',
      },
      {
        levelId: 'w1-robot-farm-1.10',
        code: 'lengths = get_plot_lengths()\nfor i in range(len(lengths)):\n    for _ in range(4):\n        step()\n        harvest()\n',
        label: 'hardcoded width 4 instead of lengths[i]',
      },
      {
        levelId: 'w1-robot-farm-1.11',
        code: 'def harvest_plot():\n    step()\n    return 0\nfor _ in range(1):\n    if can_harvest():\n        harvest()\n',
        label: 'parameterless def fails minFunctionParams',
      },
      {
        levelId: 'w1-robot-farm-1.12',
        code: 'def harvest_lane(length):\n    for _ in range(length):\n        step()\n        if can_harvest():\n            harvest()\n    turn_right()\n    turn_right()\n    for _ in range(length):\n        step()\nlengths = get_plot_lengths()\nfor i in range(len(lengths)):\n    harvest_lane(lengths[i])\n    if i < len(lengths) - 1:\n        turn_left()\n        step()\n        step()\n        turn_left()\n',
        label: 'skips spine recharge on capstone dome',
      },
    ];

    for (const item of badSubmissions) {
      const manifest = byId.get(item.levelId);
      expect(manifest).toBeDefined();
      const res = await validator.validateLevel({
        ...manifest!,
        referenceSolution: item.code,
      });
      expect(
        res.valid,
        `Anti-guessing failure: "${item.label}" unexpectedly passed ${item.levelId}!`,
      ).toBe(false);
    }
  }, 60000);
});
