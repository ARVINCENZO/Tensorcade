import type { LevelBundle, LevelManifest } from '../schema.js';
import { createRobotFarmToolbox } from './robot-farm-toolboxes.js';

export const LEVEL_1_11_MANIFEST: LevelManifest = {
  schemaVersion: '1.0.0',
  id: 'w1-robot-farm-1.11',
  worldId: 'world-1',
  gameId: 'robot-farm',
  order: 11,
  title: 'Modular Harvester',
  slug: 'modular-harvester',
  learningObjective:
    'Define and invoke a parameterized Python function (def harvest_plot(length): ... return count) to reuse harvesting logic across variable sparse plots.',
  conceptTag: 'C_FUNCTIONS',
  bloomLevel: 'Create',
  misconceptionTargeted:
    'Treating functions as static labels without inputs or return values instead of parameterized, reusable computational units.',
  simplificationLabel: 'Simplified: Stateless pure-Python helper scope over grid actions.',
  difficulty: 'advanced',
  supportedModes: ['explorer', 'builder', 'hacker'],
  estimatedMinutes: 12,
  seeds: [11101, 11102, 11103, 11104, 11105],
  entrypoint: 'step',
  environmentConfig: {
    generator: 'modular_plots',
    width: 10,
    height: 7,
    maxTicks: 100,
    star2TickThreshold: 78,
  },
  blocklyToolbox: createRobotFarmToolbox({
    actions: ['robot_step', 'robot_turn_right', 'robot_turn_left', 'robot_harvest'],
    loops: ['algo_for_index', 'algo_repeat_expr'],
    logic: ['algo_if', 'algo_compare', 'robot_can_harvest'],
    math: ['robot_get_plot_lengths', 'algo_len', 'algo_list_get', 'algo_math_op', 'algo_number'],
    variables: ['algo_def_func', 'algo_return', 'algo_call_func', 'algo_var_set', 'algo_var_get'],
  }),
  starterCode: {
    explorer: '',
    builder: '',
    hacker:
      '# Define a reusable function harvest_plot(length) that harvests a sparse row, returns to the spine, and returns the count harvested.\n',
  },
  parsonsBlocks: [
    { id: 'b1', code: 'def harvest_plot(length):', isDistractor: false },
    { id: 'b2', code: 'count = 0', isDistractor: false },
    { id: 'b3', code: 'for _ in range(length):', isDistractor: false },
    { id: 'b4', code: 'step()', isDistractor: false },
    { id: 'b5', code: 'if can_harvest():', isDistractor: false },
    { id: 'b6', code: 'harvest()\ncount = count + 1', isDistractor: false },
    { id: 'b7', code: 'turn_right()\nturn_right()', isDistractor: false },
    { id: 'b8', code: 'for _ in range(length):', isDistractor: false },
    { id: 'b9', code: 'step()', isDistractor: false },
    { id: 'b10', code: 'return count', isDistractor: false },
    { id: 'b11', code: 'lengths = get_plot_lengths()', isDistractor: false },
    { id: 'b12', code: 'for i in range(len(lengths)):', isDistractor: false },
    { id: 'b13', code: 'harvest_plot(lengths[i])', isDistractor: false },
    { id: 'b14', code: 'if i < len(lengths) - 1:', isDistractor: false },
    { id: 'b15', code: 'turn_left()\nstep()\nstep()\nturn_left()', isDistractor: false },
    {
      id: 'd1',
      code: 'def harvest_plot():',
      isDistractor: true,
      explanationIfChosen:
        'Without a `length` parameter, the function cannot adapt to each plot width in `get_plot_lengths()`.',
    },
    {
      id: 'd2',
      code: 'print(count)',
      isDistractor: true,
      explanationIfChosen:
        'print() writes text to stdout instead of returning a value to the caller—use `return count`.',
    },
  ],
  referenceSolution: [
    'def harvest_plot(length):',
    '    count = 0',
    '    for _ in range(length):',
    '        step()',
    '        if can_harvest():',
    '            harvest()',
    '            count = count + 1',
    '    turn_right()',
    '    turn_right()',
    '    for _ in range(length):',
    '        step()',
    '    return count',
    '',
    'lengths = get_plot_lengths()',
    'for i in range(len(lengths)):',
    '    harvest_plot(lengths[i])',
    '    if i < len(lengths) - 1:',
    '        turn_left()',
    '        step()',
    '        step()',
    '        turn_left()',
    '',
  ].join('\n'),
  astConstraints: {
    requiredConstructs: ['def', 'return', 'for', 'if'],
    minFunctionParams: 1,
  },
  scoringRubric: {
    star1: {
      description: 'Define a parameterized function with return value and clear all 3 sparse plots',
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
      'Factor the single-row round-trip harvest (forward with `can_harvest()`, turn around, return to spine) into a reusable function taking `length` as a parameter.',
    tier2Concept:
      'In Python, `def name(param):` creates a callable unit that accepts arguments and sends results back via `return` (distinct from `print()`).',
    tier3Scaffold:
      'Define `def harvest_plot(length):` initializing `count = 0`, looping `length` times to step and conditionally harvest/increment, returning to the spine, and ending with `return count`. Call it inside your plot loop.',
  },
};

export const LEVEL_1_11_BUNDLE: LevelBundle = {
  manifest: LEVEL_1_11_MANIFEST,
  lessonContentMarkdown: `# Modular Harvester: Functions, Parameters & \`return\`

Instead of repeating nested navigation blocks inline, real Python programs encapsulate reusable behavior inside **parameterized functions** with explicit inputs and outputs.

## Anatomy of a Python Function

Per the Python 3.14 Function Definitions specification:

\`\`\`python
def harvest_plot(length):
    count = 0
    # ... traverse 'length' tiles, count harvested crops, return to spine ...
    return count
\`\`\`

- **Parameter (\`length\`):** Receives a different integer width on each call (\`harvest_plot(lengths[0])\`, \`harvest_plot(lengths[1])\`, ...).
- **Local State (\`count\`):** Scoped cleanly inside the function call rather than polluting global state.
- **\`return\` vs \`print()\`:** \`return count\` hands the integer back to the caller for further computation; \`print()\` only emits display text and returns \`None\`.

> *Simplified: Stateless pure-Python helper scope over grid actions.*

### Goal
Define a parameterized function with a \`return\` value, invoke it for each width in \`get_plot_lengths()\`, and harvest every sparse crop across all 5 seeds.
`,
};
