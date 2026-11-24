import type { LevelBundle, LevelManifest } from '../schema.js';
import { createRobotFarmToolbox } from './robot-farm-toolboxes.js';

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
    generator: 'first_furrow',
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
    ravines: [
      { x: 2, y: 0 },
      { x: 0, y: 1 },
    ],
    star2TickThreshold: 5,
  },
  blocklyToolbox: createRobotFarmToolbox({
    actions: ['robot_step', 'robot_harvest', 'robot_turn_left', 'robot_turn_right'],
  }),
  starterCode: {
    explorer: '',
    builder: '',
    hacker: '# Move the rover onto the crop tile ahead and harvest it\n',
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
        'The crop is directly in front of the rover on every seed, so turning left points away from it.',
    },
    {
      id: 'b4',
      code: 'turn_right()',
      isDistractor: true,
      explanationIfChosen:
        'The rover is already aligned with the crop directly ahead; turning right aims toward a flanking ravine.',
    },
  ],
  referenceSolution: 'step()\nharvest()\n',
  scoringRubric: {
    star1: {
      description: 'Harvest all crops across all 5 evaluation seeds',
      condition: 'cropsHarvested == 1',
    },
    star2: {
      description: 'Complete in 5 ticks or fewer',
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
    tier1Nudge: 'Check which tile the rover occupies at tick 0 versus where the crop sits.',
    tier2Concept:
      'Python executes statements strictly sequentially from top to bottom—one command per simulation tick.',
    tier3Scaffold:
      'Use two action calls: first advance one tile forward, then gather the crop on that tile.',
  },
};

export const LEVEL_1_1_BUNDLE: LevelBundle = {
  manifest: LEVEL_1_1_MANIFEST,
  lessonContentMarkdown: `# First Furrow: Sequential Execution

Welcome to **Robot Farm**! Across all 5 evaluation seeds, your rover spawns facing directly toward a ripe energy crop **one tile ahead**, with ravines guarding overshoot and wrong turns.

## How Python Runs: Top-to-Bottom Sequence

Per the Python Language Reference (Simple Statements, CPython 3.14), statements in a script execute **strictly sequentially**, one after another from top to bottom. Two commands never execute simultaneously.

In Robot Farm, each action consumes **1 discrete tick** and **1 unit of battery energy**:

| Command | Effect |
|---|---|
| \`step()\` | Moves the rover **1 tile forward** along its current heading. |
| \`harvest()\` | Gathers a crop **on the tile where the rover is currently standing**. |

## Why Order Matters

If you call \`harvest()\` before \`step()\`, the rover harvests empty soil at its spawn tile and leaves the crop uncollected. Advancing onto the crop tile *first* and harvesting *second* succeeds across all 5 randomized starting positions and headings.

> *Simplified: Robot Farm uses discrete 2D grid ticks instead of continuous physics.*

### Goal
Move onto the crop directly ahead and harvest it in 5 ticks or fewer across all 5 seeds.
`,
};
