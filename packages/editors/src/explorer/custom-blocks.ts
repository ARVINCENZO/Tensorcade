import * as Blockly from 'blockly';
import { colors } from '@tensorcade/ui';

/**
 * Custom block type constants for Explorer Blockly editor.
 */
export const EXPLORER_BLOCK_TYPES = {
  // Game API action blocks
  ROBOT_STEP: 'robot_step',
  ROBOT_TURN_LEFT: 'robot_turn_left',
  ROBOT_TURN_RIGHT: 'robot_turn_right',
  ROBOT_HARVEST: 'robot_harvest',
  ROBOT_WAIT: 'robot_wait',

  // Sensor / Query blocks
  ROBOT_IS_FRONT_CLEAR: 'robot_is_front_clear',
  ROBOT_CAN_HARVEST: 'robot_can_harvest',

  // Algorithmic control blocks
  ALGO_REPEAT: 'algo_repeat',
  ALGO_WHILE: 'algo_while',
  ALGO_IF: 'algo_if',
  ALGO_IF_ELSE: 'algo_if_else',
  ALGO_NUMBER: 'algo_number',
  ALGO_COMPARE: 'algo_compare',
} as const;

export type ExplorerBlockType = (typeof EXPLORER_BLOCK_TYPES)[keyof typeof EXPLORER_BLOCK_TYPES];

/**
 * JSON block definitions for custom Tensorcade blocks.
 */
export const customBlockDefinitions = [
  // --- Game API Actions ---
  {
    type: EXPLORER_BLOCK_TYPES.ROBOT_STEP,
    message0: 'step forward',
    previousStatement: null,
    nextStatement: null,
    colour: colors.accent.cyan,
    tooltip: 'Move the robot forward by 1 step. Transpiles to step().',
    helpUrl: '',
  },
  {
    type: EXPLORER_BLOCK_TYPES.ROBOT_TURN_LEFT,
    message0: 'turn left',
    previousStatement: null,
    nextStatement: null,
    colour: colors.accent.cyan,
    tooltip: 'Turn the robot 90 degrees counter-clockwise. Transpiles to turn_left().',
    helpUrl: '',
  },
  {
    type: EXPLORER_BLOCK_TYPES.ROBOT_TURN_RIGHT,
    message0: 'turn right',
    previousStatement: null,
    nextStatement: null,
    colour: colors.accent.cyan,
    tooltip: 'Turn the robot 90 degrees clockwise. Transpiles to turn_right().',
    helpUrl: '',
  },
  {
    type: EXPLORER_BLOCK_TYPES.ROBOT_HARVEST,
    message0: 'harvest',
    previousStatement: null,
    nextStatement: null,
    colour: colors.accent.cyan,
    tooltip: 'Harvest resource on the current tile. Transpiles to harvest().',
    helpUrl: '',
  },
  {
    type: EXPLORER_BLOCK_TYPES.ROBOT_WAIT,
    message0: 'wait',
    previousStatement: null,
    nextStatement: null,
    colour: colors.accent.cyan,
    tooltip: 'Wait for 1 simulation tick. Transpiles to wait().',
    helpUrl: '',
  },

  // --- Sensors / Conditionals ---
  {
    type: EXPLORER_BLOCK_TYPES.ROBOT_IS_FRONT_CLEAR,
    message0: 'front is clear?',
    output: 'Boolean',
    colour: colors.accent.amber,
    tooltip: 'Returns True if front tile has no obstacle. Transpiles to is_front_clear().',
    helpUrl: '',
  },
  {
    type: EXPLORER_BLOCK_TYPES.ROBOT_CAN_HARVEST,
    message0: 'can harvest?',
    output: 'Boolean',
    colour: colors.accent.amber,
    tooltip: 'Returns True if current tile can be harvested. Transpiles to can_harvest().',
    helpUrl: '',
  },

  // --- Algorithmic Control Blocks ---
  {
    type: EXPLORER_BLOCK_TYPES.ALGO_REPEAT,
    message0: 'repeat %1 times %2 do %3',
    args0: [
      {
        type: 'field_number',
        name: 'TIMES',
        value: 4,
        min: 1,
      },
      {
        type: 'input_dummy',
      },
      {
        type: 'input_statement',
        name: 'DO',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: colors.accent.emerald,
    tooltip: 'Repeat enclosed actions N times. Transpiles to for _ in range(N):.',
    helpUrl: '',
  },
  {
    type: EXPLORER_BLOCK_TYPES.ALGO_WHILE,
    message0: 'while %1 %2 do %3',
    args0: [
      {
        type: 'input_value',
        name: 'CONDITION',
        check: 'Boolean',
      },
      {
        type: 'input_dummy',
      },
      {
        type: 'input_statement',
        name: 'DO',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: colors.accent.emerald,
    tooltip: 'Loop while condition is True. Transpiles to while condition:.',
    helpUrl: '',
  },
  {
    type: EXPLORER_BLOCK_TYPES.ALGO_IF,
    message0: 'if %1 then %2',
    args0: [
      {
        type: 'input_value',
        name: 'CONDITION',
        check: 'Boolean',
      },
      {
        type: 'input_statement',
        name: 'DO',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: colors.accent.amber,
    tooltip: 'Execute statements if condition is True. Transpiles to if condition:.',
    helpUrl: '',
  },
  {
    type: EXPLORER_BLOCK_TYPES.ALGO_IF_ELSE,
    message0: 'if %1 then %2 else %3',
    args0: [
      {
        type: 'input_value',
        name: 'CONDITION',
        check: 'Boolean',
      },
      {
        type: 'input_statement',
        name: 'DO',
      },
      {
        type: 'input_statement',
        name: 'ELSE',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: colors.accent.amber,
    tooltip: 'Execute branch 1 if True, branch 2 otherwise. Transpiles to if-else.',
    helpUrl: '',
  },
  {
    type: EXPLORER_BLOCK_TYPES.ALGO_NUMBER,
    message0: '%1',
    args0: [
      {
        type: 'field_number',
        name: 'NUM',
        value: 1,
      },
    ],
    output: 'Number',
    colour: colors.accent.indigo,
    tooltip: 'Constant integer number.',
    helpUrl: '',
  },
  {
    type: EXPLORER_BLOCK_TYPES.ALGO_COMPARE,
    message0: '%1 %2 %3',
    args0: [
      {
        type: 'input_value',
        name: 'A',
      },
      {
        type: 'field_dropdown',
        name: 'OP',
        options: [
          ['==', 'EQ'],
          ['!=', 'NEQ'],
          ['<', 'LT'],
          ['<=', 'LTE'],
          ['>', 'GT'],
          ['>=', 'GTE'],
        ],
      },
      {
        type: 'input_value',
        name: 'B',
      },
    ],
    output: 'Boolean',
    colour: colors.accent.amber,
    tooltip: 'Compare two values.',
    helpUrl: '',
  },
] as const;

let blocksRegistered = false;

/**
 * Idempotently registers custom Tensorcade blocks with Blockly.
 */
export function registerCustomBlocks(): void {
  if (blocksRegistered) {
    return;
  }

  // Filter only unregistered blocks to prevent console warnings
  const toRegister = customBlockDefinitions.filter((def) => !Blockly.Blocks[def.type]);

  if (toRegister.length > 0) {
    Blockly.common.defineBlocksWithJsonArray(toRegister);
  }

  blocksRegistered = true;
}
