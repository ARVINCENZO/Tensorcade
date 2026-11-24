import type { LevelBundle, LevelManifest } from '../schema.js';

export const LEVEL_1_1_MANIFEST: LevelManifest = {
  schemaVersion: '1.0.0',
  id: 'w1-robot-farm-1.1',
  worldId: 'world-1',
  gameId: 'robot-farm',
  order: 1,
  title: 'First Furrow',
  slug: 'first-furrow',
  learningObjective:
    'Use basic step and harvest commands in sequential order to navigate to a crop tile and gather it.',
  conceptTag: 'C_SEQ',
  bloomLevel: 'Apply',
  misconceptionTargeted:
    'Believing commands run simultaneously or out of order rather than strictly top-to-bottom.',
  simplificationLabel:
    'Simplified: Robot Farm uses discrete 2D grid ticks instead of continuous physics.',
  difficulty: 'introductory',
  supportedModes: ['explorer', 'builder', 'hacker'],
  estimatedMinutes: 5,
  seeds: [10001, 10002, 10003, 10004, 10005],
  entrypoint: 'step',
  environmentConfig: {
    width: 4,
    height: 4,
    totalCrops: 1,
    maxTicks: 50,
    initialRover: {
      x: 0,
      y: 0,
      heading: 'EAST',
      energy: 100,
    },
    crops: [{ x: 1, y: 0 }],
    star2TickThreshold: 5,
  },
  starterCode: {
    explorer: '',
    builder: '',
    hacker: '# Move the rover onto the crop tile and harvest it\n',
  },
  parsonsBlocks: [
    {
      id: 'b1',
      code: 'step()',
      isDistractor: false,
    },
    {
      id: 'b2',
      code: 'harvest()',
      isDistractor: false,
    },
    {
      id: 'b3',
      code: 'turn_left()',
      isDistractor: true,
      explanationIfChosen:
        'The crop is directly in front of the rover, so turning left points away from it.',
    },
    {
      id: 'b4',
      code: 'turn_right()',
      isDistractor: true,
      explanationIfChosen:
        'The rover is already facing East toward the crop at (1, 0), so no turn is needed.',
    },
  ],
  referenceSolution: 'step()\nharvest()\n',
  scoringRubric: {
    star1: {
      description: 'Harvest all crops',
      condition: 'cropsHarvested == 1',
    },
    star2: {
      description: 'Complete in under 5 ticks',
      metric: 'ticks',
      threshold: 5,
    },
    star3: {
      description: 'Hacker mode without hints',
      hackerOnly: true,
      noHintsAllowed: true,
    },
  },
  hintLadder: {
    tier1Nudge: 'Move forward into the crop tile before trying to harvest.',
    tier2Concept:
      'Sequential execution runs each command one after another from top to bottom.',
    tier3Scaffold: 'Call step() on line 1, then call harvest() on line 2.',
  },
};

export const LEVEL_1_1_BUNDLE: LevelBundle = {
  manifest: LEVEL_1_1_MANIFEST,
  lessonContentMarkdown: `# First Furrow: Sequential Execution

Welcome to **Robot Farm**! Your rover starts at the top-left corner of a 4x4 grid, facing **East** toward a ripe crop one tile ahead.

## How Programs Run: One Step at a Time

Computers follow your instructions in **sequential order**—strictly from **top to bottom**, one line after another. The rover never runs two commands at the same time, and it never skips ahead.

In this level, each command takes **one discrete tick** on the farm grid:

- \`step()\` moves the rover **one tile forward** in the direction it is currently facing.
- \`harvest()\` gathers a crop **on the tile where the rover is standing**.

## Order Matters

If you call \`harvest()\` before \`step()\`, the rover tries to harvest an empty starting tile and misses the crop. Moving onto the crop tile *first* and harvesting *second* completes the task cleanly.

### Goal
Guide the rover to the crop at \`(1, 0)\` and harvest it in fewer than 5 ticks.
`,
};
