import type { LevelBundle, LevelManifest } from '../schema.js';
import { createRobotFarmToolbox } from './robot-farm-toolboxes.js';

export const LEVEL_1_9_MANIFEST: LevelManifest = {
  schemaVersion: '1.0.0',
  id: 'w1-robot-farm-1.9',
  worldId: 'world-1',
  gameId: 'robot-farm',
  order: 9,
  title: 'Battery Relay',
  slug: 'battery-relay',
  learningObjective:
    'Combine compound boolean guards (and) with stateful energy recharge pads to complete a long perimeter harvest.',
  conceptTag: 'C_COMPOUND_WHILE',
  bloomLevel: 'Analyze',
  misconceptionTargeted:
    'Assuming a single loop condition captures all safety invariants or that standing on a recharge pad refills battery passively without calling recharge().',
  simplificationLabel: 'Simplified: Infinite battery recharge at base.',
  difficulty: 'intermediate',
  supportedModes: ['explorer', 'builder', 'hacker'],
  estimatedMinutes: 11,
  seeds: [10901, 10902, 10903, 10904, 10905],
  entrypoint: 'step',
  environmentConfig: {
    generator: 'battery_relay',
    maxTicks: 80,
    star2TickThreshold: 45,
  },
  blocklyToolbox: createRobotFarmToolbox({
    actions: ['robot_step', 'robot_turn_right', 'robot_harvest', 'robot_recharge'],
    loops: ['algo_while'],
    logic: [
      'algo_logic_op',
      'algo_not',
      'algo_compare',
      'algo_if_else',
      'algo_if',
      'robot_has_energy',
      'robot_is_field_cleared',
      'robot_is_on_base',
      'robot_is_front_clear',
      'robot_can_harvest',
    ],
    math: ['robot_get_energy', 'algo_number'],
  }),
  starterCode: {
    explorer: '',
    builder: '',
    hacker:
      '# Starting battery is only 14! Recharge at corner BASE pads when is_on_base() and get_energy() < 12.\n',
  },
  parsonsBlocks: [
    { id: 'b1', code: 'while has_energy() and not is_field_cleared():', isDistractor: false },
    { id: 'b2', code: 'if is_on_base() and get_energy() < 12:', isDistractor: false },
    { id: 'b3', code: 'recharge()', isDistractor: false },
    { id: 'b4', code: 'if is_front_clear():', isDistractor: false },
    { id: 'b5', code: 'step()', isDistractor: false },
    { id: 'b6', code: 'else:', isDistractor: false },
    { id: 'b7', code: 'turn_right()', isDistractor: false },
    { id: 'b8', code: 'if can_harvest():', isDistractor: false },
    { id: 'b9', code: 'harvest()', isDistractor: false },
    {
      id: 'd1',
      code: 'if is_on_base() or get_energy() < 12:',
      isDistractor: true,
      explanationIfChosen:
        'Using `or` calls recharge() even when NOT on a base pad—off-base recharge() wastes 1 energy instead of refilling!',
    },
    {
      id: 'd2',
      code: 'wait()',
      isDistractor: true,
      explanationIfChosen:
        'wait() does not recharge the battery on a base pad—you must explicitly call recharge().',
    },
  ],
  referenceSolution:
    'while has_energy() and not is_field_cleared():\n    if is_on_base() and get_energy() < 12:\n        recharge()\n    if is_front_clear():\n        step()\n    else:\n        turn_right()\n    if can_harvest():\n        harvest()\n',
  astConstraints: {
    requiredConstructs: ['while', 'and'],
    bannedTokens: ['for'],
  },
  scoringRubric: {
    star1: {
      description: 'Recharge at corner base pads and harvest all crops across 5 seeds',
      condition: 'cropsHarvested == totalCropsInitial',
    },
    star2: {
      description: 'Complete in 45 ticks or fewer across all 5 seeds',
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
      'The rover starts with 14 energy, which is roughly half of what the perimeter requires—look for the glowing emerald-and-cyan Recharge Base pads at the corners.',
    tier2Concept:
      'Boolean `and` requires BOTH operands to be `True`. Calling `recharge()` off-base wastes 1 energy, so guard it with `is_on_base() and get_energy() < 12`.',
    tier3Scaffold:
      'Use `while has_energy() and not is_field_cleared():`; inside, check `if is_on_base() and get_energy() < 12:` to call `recharge()`, then step/turn and harvest.',
  },
};

export const LEVEL_1_9_BUNDLE: LevelBundle = {
  manifest: LEVEL_1_9_MANIFEST,
  lessonContentMarkdown: `# Battery Relay: Compound Boolean Logic & Energy Management

Your rover begins with **14 battery units** (max capacity: 16)—far less than the ~28 actions needed to clear the full perimeter. Corner **Recharge Base** pads restore full capacity, *but only when commanded explicitly*.

## New Battery & Base API

| Function | Returns / Effect | Cost |
|---|---|---|
| \`is_on_base()\` | \`True\` if standing on a Recharge Base pad | 0 ticks |
| \`get_energy()\` | Current integer battery level | 0 ticks |
| \`has_energy()\` | \`True\` if battery > 0 | 0 ticks |
| \`recharge()\` | Restores battery to max on a Base pad (**costs 1 energy if called off-base**) | 1 tick |

## Short-Circuit \`and\` vs \`or\`

Per the Python 3.14 Boolean Operations specification, \`A and B\` evaluates \`True\` **only when both \`A\` and \`B\` are \`True\`**.
- Checking \`if is_on_base() and get_energy() < 12:\` ensures you recharge *only* when standing on a pad *and* actually needing charge (avoiding redundant ticks when rotating on the corner pad).
- Replacing \`and\` with \`or\` fires \`recharge()\` on empty tiles, draining battery instead of restoring it.

> *Simplified: Infinite battery recharge at base.*

### Goal
Combine \`while has_energy() and not is_field_cleared():\` with guarded \`recharge()\` calls to clear all 5 seeds without exhausting battery.
`,
};
