import type { LevelBundle, LevelManifest } from '../schema.js';
import { createRobotFarmToolbox } from './robot-farm-toolboxes.js';

export const LEVEL_1_12_MANIFEST: LevelManifest = {
  schemaVersion: '1.0.0',
  id: 'w1-robot-farm-1.12',
  worldId: 'world-1',
  gameId: 'robot-farm',
  order: 12,
  title: 'Autonomous Dome Capstone',
  slug: 'autonomous-dome-capstone',
  learningObjective:
    'Decompose a multi-constraint autonomous harvesting mission (variable plots, sparse crops, ravines, and spine recharge pads) into composable Python helper functions.',
  conceptTag: 'C_DECOMPOSITION',
  bloomLevel: 'Create',
  misconceptionTargeted:
    'Writing a single fragile monolithic loop instead of decomposing distinct responsibilities (lane harvesting vs. spine transition and recharging) into focused helper functions.',
  simplificationLabel:
    'Simplified: Deterministic multi-plot dome with infinite recharge pads on spine.',
  difficulty: 'advanced',
  supportedModes: ['explorer', 'builder', 'hacker'],
  estimatedMinutes: 15,
  seeds: [11201, 11202, 11203, 11204, 11205],
  entrypoint: 'step',
  environmentConfig: {
    generator: 'capstone_dome',
    width: 11,
    height: 9,
    maxTicks: 150,
    star2TickThreshold: 120,
  },
  blocklyToolbox: createRobotFarmToolbox({
    actions: [
      'robot_step',
      'robot_turn_right',
      'robot_turn_left',
      'robot_harvest',
      'robot_recharge',
    ],
    loops: ['algo_for_index', 'algo_repeat_expr', 'algo_while'],
    logic: [
      'algo_if',
      'algo_if_else',
      'algo_compare',
      'algo_logic_op',
      'algo_not',
      'robot_can_harvest',
      'robot_is_on_base',
      'robot_is_front_clear',
      'robot_has_energy',
      'robot_is_field_cleared',
    ],
    math: [
      'robot_get_plot_lengths',
      'robot_get_energy',
      'algo_len',
      'algo_list_get',
      'algo_math_op',
      'algo_number',
    ],
    variables: ['algo_def_func', 'algo_return', 'algo_call_func', 'algo_var_set', 'algo_var_get'],
  }),
  starterCode: {
    explorer: '',
    builder: '',
    hacker:
      '# Capstone: 4 variable-width sparse plots, ravines at each end, and Recharge Bases along the spine.\n# Decompose into clean helper functions (e.g. harvest_lane(length) and advance_to_next_lane()).\n',
  },
  parsonsBlocks: [
    { id: 'b1', code: 'def harvest_lane(length):', isDistractor: false },
    { id: 'b2', code: 'for _ in range(length):', isDistractor: false },
    { id: 'b3', code: 'step()', isDistractor: false },
    { id: 'b4', code: 'if can_harvest():', isDistractor: false },
    { id: 'b5', code: 'harvest()', isDistractor: false },
    { id: 'b6', code: 'turn_right()\nturn_right()', isDistractor: false },
    { id: 'b7', code: 'for _ in range(length):', isDistractor: false },
    { id: 'b8', code: 'step()', isDistractor: false },
    { id: 'b9', code: 'def advance_to_next_lane():', isDistractor: false },
    { id: 'b10', code: 'turn_left()\nstep()\nstep()\nturn_left()', isDistractor: false },
    { id: 'b11', code: 'if is_on_base():', isDistractor: false },
    { id: 'b12', code: 'recharge()', isDistractor: false },
    { id: 'b13', code: 'lengths = get_plot_lengths()', isDistractor: false },
    { id: 'b14', code: 'for i in range(len(lengths)):', isDistractor: false },
    { id: 'b15', code: 'harvest_lane(lengths[i])', isDistractor: false },
    { id: 'b16', code: 'if i < len(lengths) - 1:', isDistractor: false },
    { id: 'b17', code: 'advance_to_next_lane()', isDistractor: false },
    {
      id: 'd1',
      code: 'recharge()',
      isDistractor: true,
      explanationIfChosen:
        'Calling an unguarded recharge() inside a lane wastes energy on non-base tiles—only recharge when `is_on_base()` is True along the spine.',
    },
    {
      id: 'd2',
      code: 'for i in range(4):',
      isDistractor: true,
      explanationIfChosen:
        'Hardcoding `range(4)` couples your orchestration to a fixed count instead of reading `len(lengths)` from survey telemetry.',
    },
  ],
  referenceSolution: [
    'def harvest_lane(length):',
    '    for _ in range(length):',
    '        step()',
    '        if can_harvest():',
    '            harvest()',
    '    turn_right()',
    '    turn_right()',
    '    for _ in range(length):',
    '        step()',
    '',
    'def advance_to_next_lane():',
    '    turn_left()',
    '    step()',
    '    step()',
    '    turn_left()',
    '    if is_on_base():',
    '        recharge()',
    '',
    'lengths = get_plot_lengths()',
    'for i in range(len(lengths)):',
    '    harvest_lane(lengths[i])',
    '    if i < len(lengths) - 1:',
    '        advance_to_next_lane()',
    '',
  ].join('\n'),
  astConstraints: {
    requiredConstructs: ['def', 'for', 'if'],
    minFunctionParams: 1,
  },
  scoringRubric: {
    star1: {
      description: 'Clear all 4 sparse dome plots while managing battery across 5 seeds',
      condition: 'cropsHarvested == totalCropsInitial',
    },
    star2: {
      description: 'Complete in 120 ticks or fewer across all 5 seeds',
      metric: 'ticks',
      threshold: 120,
    },
    star3: {
      description: 'Hacker mode without hints',
      hackerOnly: true,
      noHintsAllowed: true,
    },
  },
  hintLadder: {
    tier1Nudge:
      'Break the mission into two small responsibilities: (1) harvesting one sparse lane and returning to the spine, and (2) moving south to the next lane and recharging at the spine Base pad.',
    tier2Concept:
      'Functional decomposition separates distinct sub-problems into small named functions (`harvest_lane(length)` and `advance_to_next_lane()`), making the top-level orchestration loop concise and easy to verify.',
    tier3Scaffold:
      'Define `harvest_lane(length)` (forward `length` with `if can_harvest():`, U-turn, return `length`) and `advance_to_next_lane()` (step south 2 rows, face east, `if is_on_base(): recharge()`), then loop over `range(len(lengths))`.',
  },
};

export const LEVEL_1_12_BUNDLE: LevelBundle = {
  manifest: LEVEL_1_12_MANIFEST,
  lessonContentMarkdown: `# Autonomous Dome Capstone: Functional Decomposition

Welcome to the final mission of **Robot Farm**! This 11×9 agricultural dome integrates every Python foundation you built across Levels 1.1–1.11:

- **4 parallel plots** with seeded variable widths from \`get_plot_lengths()\` (between 3 and 7 tiles each).
- **Sparse seeded crops** requiring \`if can_harvest():\` to conserve battery.
- **End-of-lane ravines** punishing off-by-one counts.
- **Tight starting battery (32 / 36 max)** requiring \`if is_on_base(): recharge()\` at the Recharge Base pads positioned along the west spine at rows 3, 5, and 7.

## Engineering Decomposition

Good software engineering separates *what* each subsystem does into small, single-purpose functions:
1. \`harvest_lane(length)\` — traverses one east-west furrow of width \`length\`, harvests crops selectively, and returns to the spine facing West.
2. \`advance_to_next_lane()\` — pivots from the spine down 2 rows onto the next lane's Recharge Base, faces East, and tops up the battery.
3. **Top-level orchestrator** — reads \`lengths = get_plot_lengths()\` and coordinates both helpers for \`i in range(len(lengths))\`.

> *Simplified: Deterministic multi-plot dome with infinite recharge pads on spine.*

### Goal
Compose reusable helper functions to harvest all 4 sparse plots without exhausting battery or hitting ravines across all 5 seeds in 120 ticks or fewer.
`,
};
