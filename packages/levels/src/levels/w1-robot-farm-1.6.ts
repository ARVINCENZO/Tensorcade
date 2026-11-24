import type { LevelBundle, LevelManifest } from '../schema.js';
import { createRobotFarmToolbox } from './robot-farm-toolboxes.js';

export const LEVEL_1_6_MANIFEST: LevelManifest = {
  schemaVersion: '1.0.0',
  id: 'w1-robot-farm-1.6',
  worldId: 'world-1',
  gameId: 'robot-farm',
  order: 6,
  title: 'Rock Corridor',
  slug: 'rock-corridor',
  learningObjective:
    'Use mutually exclusive if/else branching with is_front_clear() to navigate a clockwise rock-walled corridor whose segment lengths vary per seed.',
  conceptTag: 'C_COND_IF_ELSE',
  bloomLevel: 'Apply',
  misconceptionTargeted:
    'Assuming both if and else branches can run on the same tick, or attempting to hardcode turn positions despite randomized bends.',
  simplificationLabel: 'Simplified: Single-width corridor with right-hand rock corners.',
  difficulty: 'intermediate',
  supportedModes: ['explorer', 'builder', 'hacker'],
  estimatedMinutes: 9,
  seeds: [10601, 10602, 10603, 10604, 10605],
  entrypoint: 'step',
  environmentConfig: {
    generator: 'rock_corridor',
    width: 10,
    height: 10,
    maxTicks: 60,
    star2TickThreshold: 30,
  },
  blocklyToolbox: createRobotFarmToolbox({
    actions: ['robot_step', 'robot_turn_right', 'robot_harvest'],
    loops: ['algo_repeat_expr'],
    logic: ['algo_if_else', 'algo_if', 'robot_is_front_clear', 'robot_can_harvest'],
    math: ['robot_get_row_length'],
  }),
  starterCode: {
    explorer: '',
    builder: '',
    hacker:
      '# Segment lengths change across seeds. Move forward when front is clear, else turn right.\n',
  },
  parsonsBlocks: [
    { id: 'b1', code: 'for _ in range(get_row_length()):', isDistractor: false },
    { id: 'b2', code: 'if is_front_clear():', isDistractor: false },
    { id: 'b3', code: 'step()', isDistractor: false },
    { id: 'b4', code: 'if can_harvest():', isDistractor: false },
    { id: 'b5', code: 'harvest()', isDistractor: false },
    { id: 'b6', code: 'else:', isDistractor: false },
    { id: 'b7', code: 'turn_right()', isDistractor: false },
    {
      id: 'd1',
      code: 'turn_left()',
      isDistractor: true,
      explanationIfChosen:
        'This corridor bends clockwise at every rock obstacle—turning left points away from the track.',
    },
    {
      id: 'd2',
      code: 'if not is_front_clear():',
      isDistractor: true,
      explanationIfChosen:
        'Using else: directly after if is_front_clear(): expresses the mutually exclusive branch cleanly without double-checking.',
    },
  ],
  referenceSolution:
    'for _ in range(get_row_length()):\n    if is_front_clear():\n        step()\n        if can_harvest():\n            harvest()\n    else:\n        turn_right()\n',
  astConstraints: {
    requiredConstructs: ['for', 'if', 'else'],
    maxActionCalls: { step: 2 },
  },
  scoringRubric: {
    star1: {
      description: 'Navigate all rock bends and harvest every crop across 5 seeds',
      condition: 'cropsHarvested == totalCropsInitial',
    },
    star2: {
      description: 'Complete in 30 ticks or fewer across all 5 seeds',
      metric: 'ticks',
      threshold: 30,
    },
    star3: {
      description: 'Hacker mode without hints',
      hackerOnly: true,
      noHintsAllowed: true,
    },
  },
  hintLadder: {
    tier1Nudge:
      'At each iteration of `get_row_length()`, either the tile ahead is clear (step forward) or a rock blocks your path (turn right).',
    tier2Concept:
      'An `if / else` pair guarantees mutual exclusion: exactly one branch executes per iteration—never both.',
    tier3Scaffold:
      'Loop `get_row_length()` times: `if is_front_clear():` step and check `can_harvest()`, `else:` rotate right.',
  },
};

export const LEVEL_1_6_BUNDLE: LevelBundle = {
  manifest: LEVEL_1_6_MANIFEST,
  lessonContentMarkdown: `# Rock Corridor: Mutually Exclusive \`if / else\` Branching

Your rover must follow a 3-segment clockwise corridor where **rocks sit at unpredictable bend distances** on every seed. \`get_row_length()\` gives the exact total number of move-or-turn decisions needed to reach the final crop.

## Mutual Exclusion

In Python, an \`if / else\` statement guarantees that **exactly one** branch runs per evaluation:

\`\`\`python
if is_front_clear():
    step()
else:
    turn_right()
\`\`\`

- When the tile directly ahead is open, \`is_front_clear()\` returns \`True\` and the rover steps forward (and harvests if a crop is present).
- When a rock blocks the tile directly ahead, \`is_front_clear()\` returns \`False\` and the \`else\` branch turns the rover 90° clockwise without stepping into the rock.

> *Simplified: Single-width corridor with right-hand rock corners.*

### Goal
Navigate all rock corners and harvest every crop across all 5 seeds using \`if / else\`.
`,
};
