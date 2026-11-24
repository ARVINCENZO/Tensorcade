import type { LevelBundle, LevelManifest } from '../schema.js';
import { createRobotFarmToolbox } from './robot-farm-toolboxes.js';

export const LEVEL_1_8_MANIFEST: LevelManifest = {
  schemaVersion: '1.0.0',
  id: 'w1-robot-farm-1.8',
  worldId: 'world-1',
  gameId: 'robot-farm',
  order: 8,
  title: 'The Shifting Perimeter',
  slug: 'the-shifting-perimeter',
  learningObjective:
    'Control indefinite iteration with a while loop and logical negation (not is_field_cleared()) when total path length is unknown.',
  conceptTag: 'C_WHILE_LOOP',
  bloomLevel: 'Apply',
  misconceptionTargeted:
    'Assuming a loop stops automatically once the goal appears complete, or attempting to guess a fixed iteration count for an unknown perimeter.',
  simplificationLabel: 'Simplified: Rectangular perimeter bounded by impassable rock walls.',
  difficulty: 'intermediate',
  supportedModes: ['explorer', 'builder', 'hacker'],
  estimatedMinutes: 10,
  seeds: [10801, 10802, 10803, 10804, 10805],
  entrypoint: 'step',
  environmentConfig: {
    generator: 'shifting_perimeter',
    maxTicks: 80,
    star2TickThreshold: 45,
  },
  blocklyToolbox: createRobotFarmToolbox({
    actions: ['robot_step', 'robot_turn_right', 'robot_harvest'],
    loops: ['algo_while'],
    logic: [
      'algo_not',
      'algo_if_else',
      'algo_if',
      'robot_is_field_cleared',
      'robot_is_front_clear',
      'robot_can_harvest',
    ],
  }),
  starterCode: {
    explorer: '',
    builder: '',
    hacker:
      '# Dome dimensions are unknown—get_row_length() will not tell you the perimeter!\n# Patrol clockwise while not is_field_cleared():\n',
  },
  parsonsBlocks: [
    { id: 'b1', code: 'while not is_field_cleared():', isDistractor: false },
    { id: 'b2', code: 'if is_front_clear():', isDistractor: false },
    { id: 'b3', code: 'step()', isDistractor: false },
    { id: 'b4', code: 'else:', isDistractor: false },
    { id: 'b5', code: 'turn_right()', isDistractor: false },
    { id: 'b6', code: 'if can_harvest():', isDistractor: false },
    { id: 'b7', code: 'harvest()', isDistractor: false },
    {
      id: 'd1',
      code: 'while is_field_cleared():',
      isDistractor: true,
      explanationIfChosen:
        'At tick 0 the field is NOT cleared yet, so `while is_field_cleared():` is immediately False and executes zero actions.',
    },
    {
      id: 'd2',
      code: 'while True:',
      isDistractor: true,
      explanationIfChosen:
        'An unguarded `while True:` loop never checks for completion and runs until battery exhaustion.',
    },
  ],
  referenceSolution:
    'while not is_field_cleared():\n    if is_front_clear():\n        step()\n    else:\n        turn_right()\n    if can_harvest():\n        harvest()\n',
  astConstraints: {
    requiredConstructs: ['while', 'not'],
    bannedTokens: ['for'],
  },
  scoringRubric: {
    star1: {
      description: 'Harvest all perimeter crops across 5 unknown dome dimensions',
      condition: 'cropsHarvested == totalCropsInitial',
    },
    star2: {
      description: 'Complete in 45 ticks or fewer on the largest perimeter seed',
      metric: 'ticks',
      threshold: 45,
    },
    star3: {
      description: 'Hacker mode without hints',
      hackerOnly: true,
      noHintsAllowed: true,
    },
  },
  hintLadder: {
    tier1Nudge:
      'You do not know the dome width or height in advance—keep patrolling clockwise until zero crops remain.',
    tier2Concept:
      'A `while` loop repeats as long as its boolean guard stays `True`. Negate `is_field_cleared()` with `not` so the loop terminates the instant the final crop is harvested.',
    tier3Scaffold:
      'Wrap an `if is_front_clear(): step() else: turn_right()` and `if can_harvest(): harvest()` inside `while not is_field_cleared():`.',
  },
};

export const LEVEL_1_8_BUNDLE: LevelBundle = {
  manifest: LEVEL_1_8_MANIFEST,
  lessonContentMarkdown: `# The Shifting Perimeter: Dynamic \`while\` Loops

In this dome, the fenced perimeter changes width and height unpredictably across all 5 evaluation seeds—no fixed \`for\` count is provided.

## Condition-Controlled Loops

When the exact number of iterations cannot be calculated beforehand, use a **\`while\` loop** guarded by a live state predicate:

\`\`\`python
while not is_field_cleared():
    # Patrol and harvest until all crops are collected
\`\`\`

- \`is_field_cleared()\` returns \`False\` while crops remain and flips to \`True\` on the exact tick the final crop is harvested.
- The Python logical negation operator \`not\` inverts \`False\` → \`True\` (keep looping) and \`True\` → \`False\` (terminate cleanly).
- Every \`while\` loop needs **progress toward termination** (moving along the perimeter and harvesting) so it does not spin indefinitely.

> *Simplified: Rectangular perimeter bounded by impassable rock walls.*

### Goal
Use a \`while\` loop (no \`for\` loops) to patrol the shifting dome perimeter and harvest every crop across all 5 seeds.
`,
};
