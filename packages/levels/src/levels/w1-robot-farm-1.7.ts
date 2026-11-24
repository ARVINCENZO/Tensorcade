import type { LevelBundle, LevelManifest } from '../schema.js';
import { createRobotFarmToolbox } from './robot-farm-toolboxes.js';

export const LEVEL_1_7_MANIFEST: LevelManifest = {
  schemaVersion: '1.0.0',
  id: 'w1-robot-farm-1.7',
  worldId: 'world-1',
  gameId: 'robot-farm',
  order: 7,
  title: 'Hazard Triage',
  slug: 'hazard-triage',
  learningObjective:
    'Dispatch distinct obstacle responses using if/elif/else with is_rock_ahead() and is_ravine_ahead() sensors.',
  conceptTag: 'C_ELIF_LOGIC',
  bloomLevel: 'Analyze',
  misconceptionTargeted:
    'Treating all obstacles identically or assuming elif branches still execute after an earlier if branch matched.',
  simplificationLabel:
    'Simplified: Binary directional sensors (rock ahead -> turn right; ravine ahead -> turn left).',
  difficulty: 'intermediate',
  supportedModes: ['explorer', 'builder', 'hacker'],
  estimatedMinutes: 10,
  seeds: [10701, 10702, 10703, 10704, 10705],
  entrypoint: 'step',
  environmentConfig: {
    generator: 'hazard_triage',
    width: 11,
    height: 11,
    maxTicks: 60,
    star2TickThreshold: 25,
  },
  blocklyToolbox: createRobotFarmToolbox({
    actions: ['robot_step', 'robot_turn_right', 'robot_turn_left', 'robot_harvest'],
    loops: ['algo_repeat_expr'],
    logic: [
      'algo_if_elif_else',
      'algo_if',
      'robot_is_rock_ahead',
      'robot_is_ravine_ahead',
      'robot_can_harvest',
    ],
    math: ['robot_get_row_length'],
  }),
  starterCode: {
    explorer: '',
    builder: '',
    hacker:
      '# Rock ahead -> turn_right() | Ravine ahead -> turn_left() | Clear -> step() and harvest if crop\n',
  },
  parsonsBlocks: [
    { id: 'b1', code: 'for _ in range(get_row_length()):', isDistractor: false },
    { id: 'b2', code: 'if is_rock_ahead():', isDistractor: false },
    { id: 'b3', code: 'turn_right()', isDistractor: false },
    { id: 'b4', code: 'elif is_ravine_ahead():', isDistractor: false },
    { id: 'b5', code: 'turn_left()', isDistractor: false },
    { id: 'b6', code: 'else:', isDistractor: false },
    { id: 'b7', code: 'step()', isDistractor: false },
    { id: 'b8', code: 'if can_harvest():', isDistractor: false },
    { id: 'b9', code: 'harvest()', isDistractor: false },
    {
      id: 'd1',
      code: 'if is_front_clear():',
      isDistractor: true,
      explanationIfChosen:
        'is_front_clear() cannot distinguish rocks (turn right) from ravines (turn left); use is_rock_ahead() and is_ravine_ahead().',
    },
    {
      id: 'd2',
      code: 'elif is_rock_ahead():',
      isDistractor: true,
      explanationIfChosen:
        'Testing is_rock_ahead() twice leaves ravines unhandled, causing the rover to step into the ravine.',
    },
  ],
  referenceSolution:
    'for _ in range(get_row_length()):\n    if is_rock_ahead():\n        turn_right()\n    elif is_ravine_ahead():\n        turn_left()\n    else:\n        step()\n        if can_harvest():\n            harvest()\n',
  astConstraints: {
    requiredConstructs: ['for', 'if', 'elif', 'else'],
    maxActionCalls: { step: 2 },
  },
  scoringRubric: {
    star1: {
      description: 'Triage both rock and ravine junctions and harvest all crops across 5 seeds',
      condition: 'cropsHarvested == totalCropsInitial',
    },
    star2: {
      description: 'Complete in 25 ticks or fewer across all 5 seeds',
      metric: 'ticks',
      threshold: 25,
    },
    star3: {
      description: 'Hacker mode without hints',
      hackerOnly: true,
      noHintsAllowed: true,
    },
  },
  hintLadder: {
    tier1Nudge:
      'Inspect the two junctions: rocks always route to the right while ravines always route to the left, and their order flips across seeds.',
    tier2Concept:
      'An `if / elif / else` chain tests conditions top-to-bottom and runs only the first matching branch, avoiding conflicting turns on the same tick.',
    tier3Scaffold:
      'Inside `for _ in range(get_row_length()):`, branch on `is_rock_ahead()` (turn right), `elif is_ravine_ahead():` (turn left), `else:` step and conditionally harvest.',
  },
};

export const LEVEL_1_7_BUNDLE: LevelBundle = {
  manifest: LEVEL_1_7_MANIFEST,
  lessonContentMarkdown: `# Hazard Triage: Multi-Way \`if / elif / else\` Branching

Generic obstacle detection (\`is_front_clear()\`) is no longer enough: this corridor mixes **rocks** and **ravines**, and the order in which they appear flips across evaluation seeds.

## Routing Protocol

| Sensor | Condition Ahead | Required Response |
|---|---|---|
| \`is_rock_ahead()\` | Solid rock tile | \`turn_right()\` |
| \`is_ravine_ahead()\` | Ravine pit or dome boundary | \`turn_left()\` |
| Otherwise (\`else\`) | Clear tile | \`step()\`, then harvest if \`can_harvest()\` |

## Why \`elif\` Matters Over Independent \`if\` Statements

Per the Python Language Reference (The \`if\` statement, CPython 3.14), an \`if / elif / else\` chain selects **at most one suite**. Writing two separate \`if\` statements instead of \`elif\` risks running a second test *after* the rover has already rotated—causing it to immediately trigger the opposite branch on the new heading.

> *Simplified: Binary directional sensors (rock ahead -> turn right; ravine ahead -> turn left).*

### Goal
Use \`if / elif / else\` to navigate every rock and ravine junction and collect all crops across all 5 seeds.
`,
};
