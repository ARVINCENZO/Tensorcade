import type { LevelBundle, LevelManifest } from '../schema.js';
import { createRobotFarmToolbox } from './robot-farm-toolboxes.js';

export const LEVEL_1_2_MANIFEST: LevelManifest = {
  schemaVersion: '1.0.0',
  id: 'w1-robot-farm-1.2',
  worldId: 'world-1',
  gameId: 'robot-farm',
  order: 2,
  title: 'Turning Corners',
  slug: 'turning-corners',
  learningObjective:
    'Combine relative rotation commands with multi-step movement in strict sequence to navigate a rotated L-shaped corridor.',
  conceptTag: 'C_SEQ_TURNS',
  bloomLevel: 'Apply',
  misconceptionTargeted:
    'Assuming turns rotate to an absolute compass direction or that turning also advances the rover forward by one tile.',
  simplificationLabel:
    'Simplified: 90-degree instantaneous in-place turns with zero turning radius.',
  difficulty: 'introductory',
  supportedModes: ['explorer', 'builder', 'hacker'],
  estimatedMinutes: 6,
  seeds: [10201, 10202, 10203, 10204, 10205],
  entrypoint: 'step',
  environmentConfig: {
    generator: 'corner_corridor',
    width: 6,
    height: 6,
    maxTicks: 50,
    star2TickThreshold: 8,
  },
  blocklyToolbox: createRobotFarmToolbox({
    actions: ['robot_step', 'robot_turn_right', 'robot_turn_left', 'robot_harvest'],
  }),
  starterCode: {
    explorer: '',
    builder: '',
    hacker: '# Navigate 2 tiles forward, turn right at the bend, advance 2 tiles, and harvest\n',
  },
  parsonsBlocks: [
    { id: 'b1', code: 'step()', isDistractor: false },
    { id: 'b2', code: 'step()', isDistractor: false },
    { id: 'b3', code: 'turn_right()', isDistractor: false },
    { id: 'b4', code: 'step()', isDistractor: false },
    { id: 'b5', code: 'step()', isDistractor: false },
    { id: 'b6', code: 'harvest()', isDistractor: false },
    {
      id: 'd1',
      code: 'turn_left()',
      isDistractor: true,
      explanationIfChosen:
        'Turning left at the corner aims the rover directly toward the ravine guarding the wrong branch.',
    },
    {
      id: 'd2',
      code: 'wait()',
      isDistractor: true,
      explanationIfChosen:
        'wait() holds position without moving or rotating, adding unnecessary ticks.',
    },
  ],
  referenceSolution: 'step()\nstep()\nturn_right()\nstep()\nstep()\nharvest()\n',
  scoringRubric: {
    star1: {
      description: 'Harvest the crop across all 5 rotated corridor orientations',
      condition: 'cropsHarvested == 1',
    },
    star2: {
      description: 'Complete in 8 ticks or fewer',
      metric: 'ticks',
      threshold: 8,
    },
    star3: {
      description: 'Hacker mode without hints',
      hackerOnly: true,
      noHintsAllowed: true,
    },
  },
  hintLadder: {
    tier1Nudge:
      'Count how many tiles lie between the rover and the corner bend, then check which side the corridor turns toward relative to the rover nose.',
    tier2Concept:
      'turn_right() rotates 90 degrees clockwise in place without moving forward—you still must call step() after turning.',
    tier3Scaffold:
      'Advance 2 tiles, rotate 90 degrees clockwise, advance 2 more tiles along the new heading, then call harvest().',
  },
};

export const LEVEL_1_2_BUNDLE: LevelBundle = {
  manifest: LEVEL_1_2_MANIFEST,
  lessonContentMarkdown: `# Turning Corners: Relative Headings & State Transitions

Across the 5 evaluation seeds, this L-shaped agricultural corridor is rotated to face different compass headings. Your instructions must therefore work **relative to the rover's own orientation**.

## In-Place Rotation vs. Translation

A common beginner bug is assuming \`turn_right()\` also moves the rover onto the adjacent tile. In discrete robotics kinematics (and Robot Farm):

| Command | Position Change | Heading Change |
|---|---|---|
| \`step()\` | +1 tile forward | None |
| \`turn_right()\` | None (in place) | +90° clockwise (N → E → S → W → N) |
| \`turn_left()\` | None (in place) | -90° counter-clockwise (N → W → S → E → N) |

Because ravines guard both the overshoot tile past the corner and the left branch, miscounting steps or turning left triggers an immediate ravine crash.

> *Simplified: 90-degree instantaneous in-place turns with zero turning radius.*

### Goal
Traverse 2 tiles to the corner, rotate right, advance 2 tiles onto the crop, and harvest it in 8 ticks or fewer across all 5 seeds.
`,
};
