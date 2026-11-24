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
  ROBOT_RECHARGE: 'robot_recharge',

  // Sensor / Query blocks
  ROBOT_IS_FRONT_CLEAR: 'robot_is_front_clear',
  ROBOT_IS_ROCK_AHEAD: 'robot_is_rock_ahead',
  ROBOT_IS_RAVINE_AHEAD: 'robot_is_ravine_ahead',
  ROBOT_CAN_HARVEST: 'robot_can_harvest',
  ROBOT_IS_ON_BASE: 'robot_is_on_base',
  ROBOT_HAS_ENERGY: 'robot_has_energy',
  ROBOT_GET_ENERGY: 'robot_get_energy',
  ROBOT_IS_FIELD_CLEARED: 'robot_is_field_cleared',
  ROBOT_GET_ROW_LENGTH: 'robot_get_row_length',
  ROBOT_GET_PLOT_LENGTHS: 'robot_get_plot_lengths',

  // Algorithmic control blocks
  ALGO_REPEAT: 'algo_repeat',
  ALGO_REPEAT_EXPR: 'algo_repeat_expr',
  ALGO_FOR_INDEX: 'algo_for_index',
  ALGO_WHILE: 'algo_while',
  ALGO_IF: 'algo_if',
  ALGO_IF_ELSE: 'algo_if_else',
  ALGO_IF_ELIF_ELSE: 'algo_if_elif_else',
  ALGO_LOGIC_OP: 'algo_logic_op',
  ALGO_NOT: 'algo_not',
  ALGO_NUMBER: 'algo_number',
  ALGO_MATH_OP: 'algo_math_op',
  ALGO_COMPARE: 'algo_compare',
  ALGO_LEN: 'algo_len',
  ALGO_LIST_GET: 'algo_list_get',
  ALGO_VAR_SET: 'algo_var_set',
  ALGO_VAR_GET: 'algo_var_get',
  ALGO_DEF_FUNC: 'algo_def_func',
  ALGO_RETURN: 'algo_return',
  ALGO_CALL_FUNC: 'algo_call_func',
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
  {
    type: EXPLORER_BLOCK_TYPES.ROBOT_RECHARGE,
    message0: 'recharge',
    previousStatement: null,
    nextStatement: null,
    colour: colors.accent.cyan,
    tooltip: 'Recharge rover battery on a Base pad. Transpiles to recharge().',
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
    type: EXPLORER_BLOCK_TYPES.ROBOT_IS_ROCK_AHEAD,
    message0: 'rock ahead?',
    output: 'Boolean',
    colour: colors.accent.amber,
    tooltip: 'Returns True if front tile contains a rock. Transpiles to is_rock_ahead().',
    helpUrl: '',
  },
  {
    type: EXPLORER_BLOCK_TYPES.ROBOT_IS_RAVINE_AHEAD,
    message0: 'ravine ahead?',
    output: 'Boolean',
    colour: colors.accent.amber,
    tooltip:
      'Returns True if front tile is a ravine or grid edge. Transpiles to is_ravine_ahead().',
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
  {
    type: EXPLORER_BLOCK_TYPES.ROBOT_IS_ON_BASE,
    message0: 'on recharge base?',
    output: 'Boolean',
    colour: colors.accent.amber,
    tooltip: 'Returns True if standing on a recharge base pad. Transpiles to is_on_base().',
    helpUrl: '',
  },
  {
    type: EXPLORER_BLOCK_TYPES.ROBOT_HAS_ENERGY,
    message0: 'has energy?',
    output: 'Boolean',
    colour: colors.accent.amber,
    tooltip: 'Returns True if rover energy > 0. Transpiles to has_energy().',
    helpUrl: '',
  },
  {
    type: EXPLORER_BLOCK_TYPES.ROBOT_GET_ENERGY,
    message0: 'get energy',
    output: 'Number',
    colour: colors.accent.indigo,
    tooltip: 'Returns current battery energy integer. Transpiles to get_energy().',
    helpUrl: '',
  },
  {
    type: EXPLORER_BLOCK_TYPES.ROBOT_IS_FIELD_CLEARED,
    message0: 'field is cleared?',
    output: 'Boolean',
    colour: colors.accent.amber,
    tooltip: 'Returns True once all crops are harvested. Transpiles to is_field_cleared().',
    helpUrl: '',
  },
  {
    type: EXPLORER_BLOCK_TYPES.ROBOT_GET_ROW_LENGTH,
    message0: 'row length',
    output: 'Number',
    colour: colors.accent.indigo,
    tooltip: 'Returns the seeded furrow/path length. Transpiles to get_row_length().',
    helpUrl: '',
  },
  {
    type: EXPLORER_BLOCK_TYPES.ROBOT_GET_PLOT_LENGTHS,
    message0: 'plot lengths list',
    output: 'Array',
    colour: colors.accent.indigo,
    tooltip: 'Returns list of seeded plot widths. Transpiles to get_plot_lengths().',
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
  {
    type: EXPLORER_BLOCK_TYPES.ALGO_REPEAT_EXPR,
    message0: 'repeat %1 times %2 do %3',
    args0: [
      { type: 'input_value', name: 'TIMES', check: 'Number' },
      { type: 'input_dummy' },
      { type: 'input_statement', name: 'DO' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: colors.accent.emerald,
    tooltip:
      'Repeat enclosed actions using a dynamic count expression. Transpiles to for _ in range(expr):.',
    helpUrl: '',
  },
  {
    type: EXPLORER_BLOCK_TYPES.ALGO_FOR_INDEX,
    message0: 'for %1 in range(%2) %3 do %4',
    args0: [
      { type: 'field_input', name: 'VAR', text: 'i' },
      { type: 'input_value', name: 'STOP', check: 'Number' },
      { type: 'input_dummy' },
      { type: 'input_statement', name: 'DO' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: colors.accent.emerald,
    tooltip: 'Iterate an index variable from 0 to stop - 1. Transpiles to for i in range(stop):.',
    helpUrl: '',
  },
  {
    type: EXPLORER_BLOCK_TYPES.ALGO_IF_ELIF_ELSE,
    message0: 'if %1 then %2 elif %3 then %4 else %5',
    args0: [
      { type: 'input_value', name: 'COND1', check: 'Boolean' },
      { type: 'input_statement', name: 'DO1' },
      { type: 'input_value', name: 'COND2', check: 'Boolean' },
      { type: 'input_statement', name: 'DO2' },
      { type: 'input_statement', name: 'ELSE' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: colors.accent.amber,
    tooltip: 'Three-way conditional branch. Transpiles to if / elif / else.',
    helpUrl: '',
  },
  {
    type: EXPLORER_BLOCK_TYPES.ALGO_LOGIC_OP,
    message0: '%1 %2 %3',
    args0: [
      { type: 'input_value', name: 'A', check: 'Boolean' },
      {
        type: 'field_dropdown',
        name: 'OP',
        options: [
          ['and', 'AND'],
          ['or', 'OR'],
        ],
      },
      { type: 'input_value', name: 'B', check: 'Boolean' },
    ],
    output: 'Boolean',
    colour: colors.accent.amber,
    tooltip: 'Combine two boolean conditions with and / or.',
    helpUrl: '',
  },
  {
    type: EXPLORER_BLOCK_TYPES.ALGO_NOT,
    message0: 'not %1',
    args0: [{ type: 'input_value', name: 'BOOL', check: 'Boolean' }],
    output: 'Boolean',
    colour: colors.accent.amber,
    tooltip: 'Negate a boolean condition. Transpiles to not condition.',
    helpUrl: '',
  },
  {
    type: EXPLORER_BLOCK_TYPES.ALGO_MATH_OP,
    message0: '%1 %2 %3',
    args0: [
      { type: 'input_value', name: 'A', check: 'Number' },
      {
        type: 'field_dropdown',
        name: 'OP',
        options: [
          ['+', 'ADD'],
          ['-', 'SUB'],
          ['*', 'MUL'],
          ['//', 'FLOORDIV'],
          ['%', 'MOD'],
        ],
      },
      { type: 'input_value', name: 'B', check: 'Number' },
    ],
    output: 'Number',
    colour: colors.accent.indigo,
    tooltip: 'Arithmetic operation (+, -, *, //, %).',
    helpUrl: '',
  },
  {
    type: EXPLORER_BLOCK_TYPES.ALGO_LEN,
    message0: 'len(%1)',
    args0: [{ type: 'input_value', name: 'LIST' }],
    output: 'Number',
    colour: colors.accent.indigo,
    tooltip: 'Returns the number of items in a list. Transpiles to len(list).',
    helpUrl: '',
  },
  {
    type: EXPLORER_BLOCK_TYPES.ALGO_LIST_GET,
    message0: '%1 [ %2 ]',
    args0: [
      { type: 'input_value', name: 'LIST' },
      { type: 'input_value', name: 'INDEX', check: 'Number' },
    ],
    output: 'Number',
    colour: colors.accent.indigo,
    tooltip: '0-based Python list indexing. Transpiles to list[index].',
    helpUrl: '',
  },
  {
    type: EXPLORER_BLOCK_TYPES.ALGO_VAR_SET,
    message0: 'set %1 = %2',
    args0: [
      { type: 'field_input', name: 'VAR', text: 'count' },
      { type: 'input_value', name: 'VALUE' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: colors.accent.crimson,
    tooltip: 'Assign a Python variable. Transpiles to name = value.',
    helpUrl: '',
  },
  {
    type: EXPLORER_BLOCK_TYPES.ALGO_VAR_GET,
    message0: 'var %1',
    args0: [{ type: 'field_input', name: 'VAR', text: 'count' }],
    output: null,
    colour: colors.accent.crimson,
    tooltip: 'Read a Python variable by name.',
    helpUrl: '',
  },
  {
    type: EXPLORER_BLOCK_TYPES.ALGO_DEF_FUNC,
    message0: 'def %1 ( %2 ): %3 %4',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'harvest_plot' },
      { type: 'field_input', name: 'PARAM', text: 'length' },
      { type: 'input_dummy' },
      { type: 'input_statement', name: 'BODY' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: colors.accent.crimson,
    tooltip: 'Define a reusable Python function. Transpiles to def name(param):.',
    helpUrl: '',
  },
  {
    type: EXPLORER_BLOCK_TYPES.ALGO_RETURN,
    message0: 'return %1',
    args0: [{ type: 'input_value', name: 'VALUE' }],
    previousStatement: null,
    nextStatement: null,
    colour: colors.accent.crimson,
    tooltip: 'Return a value from a function. Transpiles to return value.',
    helpUrl: '',
  },
  {
    type: EXPLORER_BLOCK_TYPES.ALGO_CALL_FUNC,
    message0: 'call %1 ( %2 )',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'harvest_plot' },
      { type: 'input_value', name: 'ARG' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: colors.accent.crimson,
    tooltip: 'Invoke a defined Python function with an optional argument.',
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
