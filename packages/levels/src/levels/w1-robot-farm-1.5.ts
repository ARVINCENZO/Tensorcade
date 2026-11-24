import type { LevelBundle, LevelManifest } from '../schema.js';
import { createRobotFarmToolbox } from './robot-farm-toolboxes.js';

export const LEVEL_1_5_MANIFEST: LevelManifest = {
  schemaVersion: '1.0.0',
  id: 'w1-robot-farm-1.5',
  worldId: 'world-1',
  gameId: 'robot-farm',
  order: 5,
  title: 'Selective Harvest',
  slug: 'selective-harvest',
  learningObjective:
    'Nest an if conditional inside a for loop to query live tile sensors on every iteration and conserve battery energy.',
  conceptTag: 'C_COND_IF',
  bloomLevel: 'Apply',
  misconceptionTargeted:
    'Believing an if statement evaluates once at program start rather than re-evaluating dynamically on every loop iteration.',
  simplificationLabel: 'Simplified: Binary tile crop sensor (can_harvest() -> True/False).',
  difficulty: 'intermediate',
  supportedModes: ['explorer', 'builder', 'hacker'],
  estimatedMinutes: 8,
  seeds: [10501, 10502, 10503, 10504, 10505],
  entrypoint: 'step',
  environmentConfig: {
    generator: 'selective_row',
    width: 14,
    height: 3,
    maxTicks: 60,
    star2TickThreshold: 20,
  },
  blocklyToolbox: createRobotFarmToolbox({
    actions: ['robot_step', 'robot_harvest'],
    loops: ['algo_repeat_expr'],
    logic: ['algo_if', 'robot_can_harvest'],
    math: ['robot_get_row_length'],
  }),
  starterCode: {
    explorer: '',
    builder: '',
    hacker:
      '# Crops appear at unpredictable tiles along the row.\n# Only call harvest() when can_harvest() is True.\n',
  },
  parsonsBlocks: [
    { id: 'b1', code: 'for _ in range(get_row_length()):', isDistractor: false },
    { id: 'b2', code: 'step()', isDistractor: false },
    { id: 'b3', code: 'if can_harvest():', isDistractor: false },
    { id: 'b4', code: 'harvest()', isDistractor: false },
    {
      id: 'd1',
      code: 'if is_front_clear():',
      isDistractor: true,
      explanationIfChosen:
        'is_front_clear() checks whether the next tile is free of obstacles, not whether the current tile has a crop.',
    },
    {
      id: 'd2',
      code: 'harvest()',
      isDistractor: true,
      explanationIfChosen:
        'An extra unguarded harvest() wastes energy on empty tiles and drains the battery before finishing.',
    },
  ],
  referenceSolution:
    'for _ in range(get_row_length()):\n    step()\n    if can_harvest():\n        harvest()\n',
  astConstraints: {
    requiredConstructs: ['for', 'if'],
    maxActionCalls: { step: 2 },
  },
  scoringRubric: {
    star1: {
      description: 'Harvest all sparse seeded crops without exhausting battery',
      condition: 'cropsHarvested == totalCropsInitial',
    },
    star2: {
      description: 'Complete in 20 ticks or fewer across all 5 seeds',
      metric: 'ticks',
      threshold: 20,
    },
    star3: {
      description: 'Hacker mode without hints',
      hackerOnly: true,
      noHintsAllowed: true,
    },
  },
  hintLadder: {
    tier1Nudge:
      'Crops no longer sit at fixed intervals—check the sensor on each tile right after stepping onto it.',
    tier2Concept:
      'Nesting an `if` statement inside a `for` loop re-evaluates `can_harvest()` fresh on every tile the rover visits.',
    tier3Scaffold:
      'Inside `for _ in range(get_row_length()):`, call `step()` at 4 spaces, `if can_harvest():` at 4 spaces, and `harvest()` at 8 spaces.',
  },
};

export const LEVEL_1_5_BUNDLE: LevelBundle = {
  manifest: LEVEL_1_5_MANIFEST,
  lessonContentMarkdown: `# Selective Harvest: Dynamic \`if\` Conditionals

Real agricultural fields are uneven: crops appear at **different randomized tiles on every seed**, and your battery is strictly capped so blind harvesting drains all energy.

## Re-Evaluating State Inside a Loop

An \`if\` statement does **not** lock in its result when the script starts. When nested inside a \`for\` loop, Python evaluates the condition expression **anew on every single iteration** against the rover's current tile:

| Sensor | Returns | Cost |
|---|---|---|
| \`can_harvest()\` | \`True\` if the rover's current tile holds a crop, else \`False\` | 0 ticks, 0 energy |

Notice the two indentation levels (PEP 8: 4 spaces per block level):
- **4 spaces:** statements running on *every* step of the \`for\` loop.
- **8 spaces:** statements running *only* when \`can_harvest()\` returns \`True\`.

> *Simplified: Binary tile crop sensor (can_harvest() -> True/False).*

### Goal
Walk the furrow of length \`get_row_length()\` and harvest **only** tiles where \`can_harvest()\` is \`True\` across all 5 seeds.
`,
};
