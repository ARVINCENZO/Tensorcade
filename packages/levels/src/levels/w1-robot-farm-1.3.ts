import type { LevelBundle, LevelManifest } from '../schema.js';
import { createRobotFarmToolbox } from './robot-farm-toolboxes.js';

export const LEVEL_1_3_MANIFEST: LevelManifest = {
  schemaVersion: '1.0.0',
  id: 'w1-robot-farm-1.3',
  worldId: 'world-1',
  gameId: 'robot-farm',
  order: 3,
  title: 'The Row Harvest',
  slug: 'the-row-harvest',
  learningObjective:
    'Use a bounded Python for loop over range(get_row_length()) to harvest crop rows whose lengths vary across evaluation seeds.',
  conceptTag: 'C_FOR_LOOP',
  bloomLevel: 'Apply',
  misconceptionTargeted:
    'Treating loops as copy-paste shorthand for a fixed literal count instead of parameterizing iteration over runtime data.',
  simplificationLabel: 'Simplified: Uniform 1-crop-per-tile furrow spacing.',
  difficulty: 'introductory',
  supportedModes: ['explorer', 'builder', 'hacker'],
  estimatedMinutes: 7,
  seeds: [10301, 10304, 10307, 10311, 10319],
  entrypoint: 'step',
  environmentConfig: {
    generator: 'variable_row',
    width: 14,
    height: 3,
    maxTicks: 60,
    star2TickThreshold: 26,
  },
  blocklyToolbox: createRobotFarmToolbox({
    actions: ['robot_step', 'robot_harvest'],
    loops: ['algo_repeat_expr', 'algo_repeat'],
    math: ['robot_get_row_length', 'algo_number'],
  }),
  starterCode: {
    explorer: '',
    builder: '',
    hacker:
      '# Use get_row_length() inside a for loop to harvest every crop without hitting the ravine\n',
  },
  parsonsBlocks: [
    { id: 'b1', code: 'for _ in range(get_row_length()):', isDistractor: false },
    { id: 'b2', code: 'step()', isDistractor: false },
    { id: 'b3', code: 'harvest()', isDistractor: false },
    {
      id: 'd1',
      code: 'for _ in range(5):',
      isDistractor: true,
      explanationIfChosen:
        'A hardcoded literal count (5) crashes into the ravine on shorter rows and leaves crops unharvested on longer rows.',
    },
    {
      id: 'd2',
      code: 'turn_right()',
      isDistractor: true,
      explanationIfChosen:
        'Rocks line both sides of the furrow; turning right points into the rock border.',
    },
  ],
  referenceSolution: 'for _ in range(get_row_length()):\n    step()\n    harvest()\n',
  astConstraints: {
    requiredConstructs: ['for'],
    maxActionCalls: { step: 2 },
  },
  scoringRubric: {
    star1: {
      description: 'Harvest every crop across all 5 variable-length seeds',
      condition: 'cropsHarvested == rowLength',
    },
    star2: {
      description: 'Complete in 26 ticks or fewer on the longest seed',
      metric: 'ticks',
      threshold: 26,
    },
    star3: {
      description: 'Hacker mode without hints',
      hackerOnly: true,
      noHintsAllowed: true,
    },
  },
  hintLadder: {
    tier1Nudge:
      'Notice the furrow length changes on seeds 2–5, and a ravine sits immediately past the final crop.',
    tier2Concept:
      'A bounded for loop with range(n) repeats its indented block exactly n times. Pass get_row_length() instead of a fixed number.',
    tier3Scaffold:
      'Write a `for _ in range(get_row_length()):` header, then indent your step and harvest actions by 4 spaces inside the loop body.',
  },
};

export const LEVEL_1_3_BUNDLE: LevelBundle = {
  manifest: LEVEL_1_3_MANIFEST,
  lessonContentMarkdown: `# The Row Harvest: Bounded \`for\` Loops

In this dome, every tile along the furrow holds a ripe crop—but the furrow length changes across the 5 evaluation seeds (between 4 and 11 tiles), and a **ravine sits immediately past the last crop**.

## Why Hardcoding Fails

Writing six copies of \`step()\` and \`harvest()\` might clear one seed, but on a 4-tile seed it plunges straight into the ravine, and on a 10-tile seed it leaves crops behind.

## Parameterized Iteration with \`range()\`

Per the Python 3.14 built-in \`range(stop)\` specification, \`for _ in range(n):\` executes its **4-space indented suite** (PEP 8) exactly \`n\` times:

\`\`\`python
for _ in range(get_row_length()):
    # Runs once per tile in the furrow
\`\`\`

- \`get_row_length()\` queries the sensor telemetry for the current seed's exact furrow length (0 ticks, 0 energy).
- By Python convention (PEP 8), \`_\` names a throwaway loop counter whose numeric value is not needed inside the body.

> *Simplified: Uniform 1-crop-per-tile furrow spacing.*

### Goal
Harvest every crop across all 5 variable-length seeds using a \`for\` loop without falling into the end ravine.
`,
};
