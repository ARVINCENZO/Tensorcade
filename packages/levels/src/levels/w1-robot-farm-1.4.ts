import type { LevelBundle, LevelManifest } from '../schema.js';
import { createRobotFarmToolbox } from './robot-farm-toolboxes.js';

export const LEVEL_1_4_MANIFEST: LevelManifest = {
  schemaVersion: '1.0.0',
  id: 'w1-robot-farm-1.4',
  worldId: 'world-1',
  gameId: 'robot-farm',
  order: 4,
  title: 'Skip-Row Telemetry',
  slug: 'skip-row-telemetry',
  learningObjective:
    'Store computed telemetry in a Python variable using integer floor division (//) to drive an energy-efficient loop.',
  conceptTag: 'C_VARS_ARITH',
  bloomLevel: 'Apply',
  misconceptionTargeted:
    'Assuming range() accepts floating-point division (/) or that wasted actions on empty tiles have zero resource cost.',
  simplificationLabel: 'Simplified: Integer floor division (//) on even-length furrows.',
  difficulty: 'introductory',
  supportedModes: ['explorer', 'builder', 'hacker'],
  estimatedMinutes: 8,
  seeds: [10401, 10403, 10407, 10412, 10418],
  entrypoint: 'step',
  environmentConfig: {
    generator: 'skip_row',
    width: 16,
    height: 3,
    maxTicks: 60,
    star2TickThreshold: 24,
  },
  blocklyToolbox: createRobotFarmToolbox({
    actions: ['robot_step', 'robot_harvest'],
    loops: ['algo_repeat_expr'],
    math: ['robot_get_row_length', 'algo_math_op', 'algo_number'],
    variables: ['algo_var_set', 'algo_var_get'],
  }),
  starterCode: {
    explorer: '',
    builder: '',
    hacker:
      '# Crops appear on every 2nd tile and battery is tight.\n# Compute pairs = get_row_length() // 2 and harvest efficiently.\n',
  },
  parsonsBlocks: [
    { id: 'b1', code: 'pairs = get_row_length() // 2', isDistractor: false },
    { id: 'b2', code: 'for _ in range(pairs):', isDistractor: false },
    { id: 'b3', code: 'step()', isDistractor: false },
    { id: 'b4', code: 'step()', isDistractor: false },
    { id: 'b5', code: 'harvest()', isDistractor: false },
    {
      id: 'd1',
      code: 'pairs = get_row_length() / 2',
      isDistractor: true,
      explanationIfChosen:
        'Single-slash division (/) returns a float in Python 3, which causes TypeError inside range(). Use integer floor division (//).',
    },
    {
      id: 'd2',
      code: 'for _ in range(get_row_length()):',
      isDistractor: true,
      explanationIfChosen:
        'Stepping twice per iteration over the full row length drives into the ravine, while harvesting every tile exhausts battery.',
    },
  ],
  referenceSolution:
    'pairs = get_row_length() // 2\nfor _ in range(pairs):\n    step()\n    step()\n    harvest()\n',
  astConstraints: {
    requiredConstructs: ['for'],
    maxActionCalls: { step: 2, harvest: 1 },
  },
  scoringRubric: {
    star1: {
      description: 'Harvest every alternating crop without depleting battery',
      condition: 'cropsHarvested == rowLength // 2',
    },
    star2: {
      description: 'Complete in 24 ticks or fewer across all 5 seeds',
      metric: 'ticks',
      threshold: 24,
    },
    star3: {
      description: 'Hacker mode without hints',
      hackerOnly: true,
      noHintsAllowed: true,
    },
  },
  hintLadder: {
    tier1Nudge:
      'Calling harvest() on empty tiles still costs 1 energy—watch why your battery hits 0 before the end of the row.',
    tier2Concept:
      'In Python 3, `/` always yields a float (e.g., `6 / 2 == 3.0`), which `range()` rejects. Integer floor division `//` returns an `int` (`6 // 2 == 3`).',
    tier3Scaffold:
      'Compute `pairs = get_row_length() // 2`, then loop `pairs` times executing two steps followed by one harvest.',
  },
};

export const LEVEL_1_4_BUNDLE: LevelBundle = {
  manifest: LEVEL_1_4_MANIFEST,
  lessonContentMarkdown: `# Skip-Row Telemetry: Variables & Integer Division

Crops in this furrow are planted strictly on **every second tile** (positions 2, 4, 6, ...), and the rover's battery is tightly calibrated. Calling \`harvest()\` on empty soil wastes 1 energy per empty tile and depletes the battery before reaching the final crop.

## Python 3 Division: \`/\` vs \`//\`

Per PEP 238 and the Python 3.14 Numeric Types specification:
- **True division (\`/\`)** *always* returns a \`float\`: \`8 / 2\` produces \`4.0\`. Passing a float into \`range(4.0)\` raises \`TypeError\`.
- **Floor division (\`//\`)** returns an exact integer quotient: \`8 // 2\` produces \`4\`, which \`range()\` accepts cleanly.

## Storing Intermediate Results in Variables

Assigning \`pairs = get_row_length() // 2\` binds a meaningful name to your computed integer so your loop header reads like an explicit engineering specification.

> *Simplified: Integer floor division (//) on even-length furrows.*

### Goal
Compute the exact number of 2-tile crop pairs using \`//\` and harvest every crop within the tight battery budget across all 5 seeds.
`,
};
