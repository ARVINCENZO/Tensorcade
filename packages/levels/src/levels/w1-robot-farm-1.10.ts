import type { LevelBundle, LevelManifest } from '../schema.js';
import { createRobotFarmToolbox } from './robot-farm-toolboxes.js';

export const LEVEL_1_10_MANIFEST: LevelManifest = {
  schemaVersion: '1.0.0',
  id: 'w1-robot-farm-1.10',
  worldId: 'world-1',
  gameId: 'robot-farm',
  order: 10,
  title: 'Survey Coordinates',
  slug: 'survey-coordinates',
  learningObjective:
    'Iterate over a Python list using range(len(lengths)) and 0-based indexing (lengths[i]) to harvest 3 plots of varying widths.',
  conceptTag: 'C_LIST_INDEX',
  bloomLevel: 'Apply',
  misconceptionTargeted:
    'Believing Python list indices start at 1 instead of 0, or assuming all plots in a survey list have equal width.',
  simplificationLabel: 'Simplified: Parallel east-west plots anchored along a clear west spine.',
  difficulty: 'intermediate',
  supportedModes: ['explorer', 'builder', 'hacker'],
  estimatedMinutes: 11,
  seeds: [11001, 11002, 11003, 11004, 11005],
  entrypoint: 'step',
  environmentConfig: {
    generator: 'multi_plot',
    width: 10,
    height: 7,
    maxTicks: 100,
    star2TickThreshold: 78,
  },
  blocklyToolbox: createRobotFarmToolbox({
    actions: ['robot_step', 'robot_turn_right', 'robot_turn_left', 'robot_harvest'],
    loops: ['algo_for_index', 'algo_repeat_expr'],
    logic: ['algo_if', 'algo_compare'],
    math: ['robot_get_plot_lengths', 'algo_len', 'algo_list_get', 'algo_math_op', 'algo_number'],
    variables: ['algo_var_set', 'algo_var_get'],
  }),
  starterCode: {
    explorer: '',
    builder: '',
    hacker:
      '# get_plot_lengths() returns a list of 3 row widths, e.g. [4, 2, 6].\n# Index each width with lengths[i], harvest the row, return to the spine, and advance south.\n',
  },
  parsonsBlocks: [
    { id: 'b1', code: 'lengths = get_plot_lengths()', isDistractor: false },
    { id: 'b2', code: 'for i in range(len(lengths)):', isDistractor: false },
    { id: 'b3', code: 'row_len = lengths[i]', isDistractor: false },
    { id: 'b4', code: 'for _ in range(row_len):', isDistractor: false },
    { id: 'b5', code: 'step()', isDistractor: false },
    { id: 'b6', code: 'harvest()', isDistractor: false },
    { id: 'b7', code: 'turn_right()\nturn_right()', isDistractor: false },
    { id: 'b8', code: 'for _ in range(row_len):', isDistractor: false },
    { id: 'b9', code: 'step()', isDistractor: false },
    { id: 'b10', code: 'if i < len(lengths) - 1:', isDistractor: false },
    { id: 'b11', code: 'turn_left()\nstep()\nstep()\nturn_left()', isDistractor: false },
    {
      id: 'd1',
      code: 'row_len = lengths[i + 1]',
      isDistractor: true,
      explanationIfChosen:
        'Python lists are 0-indexed (valid indices are 0, 1, 2 for a 3-element list). Indexing `lengths[i + 1]` raises IndexError on the last iteration.',
    },
    {
      id: 'd2',
      code: 'for i in range(1, len(lengths)):',
      isDistractor: true,
      explanationIfChosen:
        'Starting `range` at 1 skips index 0, leaving the entire first agricultural plot unharvested.',
    },
  ],
  referenceSolution: [
    'lengths = get_plot_lengths()',
    'for i in range(len(lengths)):',
    '    row_len = lengths[i]',
    '    for _ in range(row_len):',
    '        step()',
    '        harvest()',
    '    turn_right()',
    '    turn_right()',
    '    for _ in range(row_len):',
    '        step()',
    '    if i < len(lengths) - 1:',
    '        turn_left()',
    '        step()',
    '        step()',
    '        turn_left()',
    '',
  ].join('\n'),
  astConstraints: {
    requiredConstructs: ['for', 'len'],
  },
  scoringRubric: {
    star1: {
      description: 'Harvest all 3 variable-width plots across all 5 seeds',
      condition: 'cropsHarvested == totalCropsInitial',
    },
    star2: {
      description: 'Complete in 78 ticks or fewer across all 5 seeds',
      metric: 'ticks',
      threshold: 78,
    },
    star3: {
      description: 'Hacker mode without hints',
      hackerOnly: true,
      noHintsAllowed: true,
    },
  },
  hintLadder: {
    tier1Nudge:
      'Each horizontal plot ends with a ravine at the exact distance given by `get_plot_lengths()[i]`, and consecutive plots sit 2 rows apart along the west spine.',
    tier2Concept:
      'Python lists use 0-based indexing: for a 3-item list, `range(len(lengths))` yields indices `0, 1, 2`, and the last index is `len(lengths) - 1`.',
    tier3Scaffold:
      'Store `lengths = get_plot_lengths()`. Loop `i` over `range(len(lengths))`: harvest `lengths[i]` steps East, turn around (2 right turns), step back `lengths[i]` West, and if `i < len(lengths) - 1`, turn left, step twice South, turn left.',
  },
};

export const LEVEL_1_10_BUNDLE: LevelBundle = {
  manifest: LEVEL_1_10_MANIFEST,
  lessonContentMarkdown: `# Survey Coordinates: Python Lists & 0-Based Indexing

Three parallel crop plots branch east off the vertical access spine, each terminated by a ravine at a **different seeded width**. Calling \`get_plot_lengths()\` returns a Python \`list\` of integers—for example \`[4, 2, 6]\`.

## Zero-Based Indexing & \`len()\`

Per the Python 3.14 Sequence Types specification, list positions start at **index \`0\`**, not \`1\`:

| Index | Expression | Example Value (\`[4, 2, 6]\`) |
|---|---|---|
| First plot | \`lengths[0]\` | \`4\` |
| Second plot | \`lengths[1]\` | \`2\` |
| Last plot | \`lengths[len(lengths) - 1]\` | \`6\` |

- \`len(lengths)\` returns the number of plots (\`3\`).
- \`range(len(lengths))\` produces \`0, 1, 2\`—matching every valid index without causing an \`IndexError\`.
- Mastering 0-based indexing here directly prepares you for 2D NumPy array indexing in World 2 (*Pixel Lab*).

> *Simplified: Parallel east-west plots anchored along a clear west spine.*

### Goal
Read \`get_plot_lengths()\`, index each plot width with \`lengths[i]\`, harvest and return to the spine on each row, and clear all 5 seeds.
`,
};
