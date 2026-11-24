import * as Blockly from 'blockly';
import { pythonGenerator, Order } from 'blockly/python';
import { EXPLORER_BLOCK_TYPES, registerCustomBlocks } from './custom-blocks.js';

let generatorsRegistered = false;

/**
 * Configure pythonGenerator indentation and register code generators
 * for all custom Tensorcade blocks following PEP 8 conventions.
 */
export function registerPythonGenerators(): void {
  if (generatorsRegistered) {
    return;
  }

  // Ensure custom blocks exist in Blockly registry first
  registerCustomBlocks();

  // Enforce PEP 8 4-space indentation
  pythonGenerator.INDENT = '    ';

  // --- Game API Action Generators ---
  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ROBOT_STEP] = function () {
    return 'step()\n';
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ROBOT_TURN_LEFT] = function () {
    return 'turn_left()\n';
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ROBOT_TURN_RIGHT] = function () {
    return 'turn_right()\n';
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ROBOT_HARVEST] = function () {
    return 'harvest()\n';
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ROBOT_WAIT] = function () {
    return 'wait()\n';
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ROBOT_RECHARGE] = function () {
    return 'recharge()\n';
  };

  // --- Sensors / Conditions ---
  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ROBOT_IS_FRONT_CLEAR] = function () {
    return ['is_front_clear()', Order.FUNCTION_CALL];
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ROBOT_IS_ROCK_AHEAD] = function () {
    return ['is_rock_ahead()', Order.FUNCTION_CALL];
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ROBOT_IS_RAVINE_AHEAD] = function () {
    return ['is_ravine_ahead()', Order.FUNCTION_CALL];
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ROBOT_CAN_HARVEST] = function () {
    return ['can_harvest()', Order.FUNCTION_CALL];
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ROBOT_IS_ON_BASE] = function () {
    return ['is_on_base()', Order.FUNCTION_CALL];
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ROBOT_HAS_ENERGY] = function () {
    return ['has_energy()', Order.FUNCTION_CALL];
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ROBOT_GET_ENERGY] = function () {
    return ['get_energy()', Order.FUNCTION_CALL];
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ROBOT_IS_FIELD_CLEARED] = function () {
    return ['is_field_cleared()', Order.FUNCTION_CALL];
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ROBOT_GET_ROW_LENGTH] = function () {
    return ['get_row_length()', Order.FUNCTION_CALL];
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ROBOT_GET_PLOT_LENGTHS] = function () {
    return ['get_plot_lengths()', Order.FUNCTION_CALL];
  };

  // --- Algorithmic Control Generators ---
  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ALGO_REPEAT] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator,
  ) {
    const times = (block.getFieldValue('TIMES') as string | null) ?? '1';
    const branch = generator.statementToCode(block, 'DO') || `${generator.INDENT}pass\n`;
    return `for _ in range(${times}):\n${branch}`;
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ALGO_WHILE] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator,
  ) {
    const condition = generator.valueToCode(block, 'CONDITION', Order.NONE) || 'True';
    const branch = generator.statementToCode(block, 'DO') || `${generator.INDENT}pass\n`;
    return `while ${condition}:\n${branch}`;
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ALGO_IF] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator,
  ) {
    const condition = generator.valueToCode(block, 'CONDITION', Order.NONE) || 'True';
    const branch = generator.statementToCode(block, 'DO') || `${generator.INDENT}pass\n`;
    return `if ${condition}:\n${branch}`;
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ALGO_IF_ELSE] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator,
  ) {
    const condition = generator.valueToCode(block, 'CONDITION', Order.NONE) || 'True';
    const branchDo = generator.statementToCode(block, 'DO') || `${generator.INDENT}pass\n`;
    const branchElse = generator.statementToCode(block, 'ELSE') || `${generator.INDENT}pass\n`;
    return `if ${condition}:\n${branchDo}else:\n${branchElse}`;
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ALGO_NUMBER] = function (block: Blockly.Block) {
    const num = (block.getFieldValue('NUM') as string | null) ?? '0';
    return [num, Order.ATOMIC];
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ALGO_COMPARE] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator,
  ) {
    const opKey = (block.getFieldValue('OP') as string | null) ?? 'EQ';
    const opMap: Record<string, string> = {
      EQ: '==',
      NEQ: '!=',
      LT: '<',
      LTE: '<=',
      GT: '>',
      GTE: '>=',
    };
    const op = opMap[opKey] ?? '==';
    const a = generator.valueToCode(block, 'A', Order.RELATIONAL) || '0';
    const b = generator.valueToCode(block, 'B', Order.RELATIONAL) || '0';
    return [`${a} ${op} ${b}`, Order.RELATIONAL];
  };

  const sanitizeIdent = (raw: string | null, fallback: string): string => {
    const trimmed = (raw ?? '').trim();
    return /^[A-Za-z_]\w*$/.test(trimmed) ? trimmed : fallback;
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ALGO_REPEAT_EXPR] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator,
  ) {
    const times = generator.valueToCode(block, 'TIMES', Order.NONE) || '1';
    const branch = generator.statementToCode(block, 'DO') || `${generator.INDENT}pass\n`;
    return `for _ in range(${times}):\n${branch}`;
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ALGO_FOR_INDEX] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator,
  ) {
    const varName = sanitizeIdent(block.getFieldValue('VAR') as string | null, 'i');
    const stop = generator.valueToCode(block, 'STOP', Order.NONE) || '0';
    const branch = generator.statementToCode(block, 'DO') || `${generator.INDENT}pass\n`;
    return `for ${varName} in range(${stop}):\n${branch}`;
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ALGO_IF_ELIF_ELSE] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator,
  ) {
    const cond1 = generator.valueToCode(block, 'COND1', Order.NONE) || 'True';
    const do1 = generator.statementToCode(block, 'DO1') || `${generator.INDENT}pass\n`;
    const cond2 = generator.valueToCode(block, 'COND2', Order.NONE) || 'False';
    const do2 = generator.statementToCode(block, 'DO2') || `${generator.INDENT}pass\n`;
    const branchElse = generator.statementToCode(block, 'ELSE') || `${generator.INDENT}pass\n`;
    return `if ${cond1}:\n${do1}elif ${cond2}:\n${do2}else:\n${branchElse}`;
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ALGO_LOGIC_OP] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator,
  ) {
    const opKey = (block.getFieldValue('OP') as string | null) ?? 'AND';
    const isAnd = opKey === 'AND';
    const op = isAnd ? 'and' : 'or';
    const order = isAnd ? Order.LOGICAL_AND : Order.LOGICAL_OR;
    const a = generator.valueToCode(block, 'A', order) || 'True';
    const b = generator.valueToCode(block, 'B', order) || 'True';
    return [`${a} ${op} ${b}`, order];
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ALGO_NOT] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator,
  ) {
    const inner = generator.valueToCode(block, 'BOOL', Order.LOGICAL_NOT) || 'False';
    return [`not ${inner}`, Order.LOGICAL_NOT];
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ALGO_MATH_OP] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator,
  ) {
    const opKey = (block.getFieldValue('OP') as string | null) ?? 'ADD';
    const map: Record<string, { op: string; order: number }> = {
      ADD: { op: '+', order: Order.ADDITIVE },
      SUB: { op: '-', order: Order.ADDITIVE },
      MUL: { op: '*', order: Order.MULTIPLICATIVE },
      FLOORDIV: { op: '//', order: Order.MULTIPLICATIVE },
      MOD: { op: '%', order: Order.MULTIPLICATIVE },
    };
    const entry = map[opKey] ?? { op: '+', order: Order.ADDITIVE };
    const a = generator.valueToCode(block, 'A', entry.order) || '0';
    const b = generator.valueToCode(block, 'B', entry.order) || '0';
    return [`${a} ${entry.op} ${b}`, entry.order];
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ALGO_LEN] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator,
  ) {
    const list = generator.valueToCode(block, 'LIST', Order.NONE) || '[]';
    return [`len(${list})`, Order.FUNCTION_CALL];
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ALGO_LIST_GET] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator,
  ) {
    const list = generator.valueToCode(block, 'LIST', Order.MEMBER) || '[]';
    const index = generator.valueToCode(block, 'INDEX', Order.NONE) || '0';
    return [`${list}[${index}]`, Order.MEMBER];
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ALGO_VAR_SET] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator,
  ) {
    const varName = sanitizeIdent(block.getFieldValue('VAR') as string | null, 'count');
    const val = generator.valueToCode(block, 'VALUE', Order.NONE) || '0';
    return `${varName} = ${val}\n`;
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ALGO_VAR_GET] = function (block: Blockly.Block) {
    const varName = sanitizeIdent(block.getFieldValue('VAR') as string | null, 'count');
    return [varName, Order.ATOMIC];
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ALGO_DEF_FUNC] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator,
  ) {
    const fnName = sanitizeIdent(block.getFieldValue('NAME') as string | null, 'harvest_plot');
    const rawParam = ((block.getFieldValue('PARAM') as string | null) ?? '').trim();
    const paramList = rawParam
      ? rawParam
          .split(',')
          .map((p) => p.trim())
          .filter((p) => /^[A-Za-z_]\w*$/.test(p))
          .join(', ')
      : '';
    const body = generator.statementToCode(block, 'BODY') || `${generator.INDENT}pass\n`;
    return `def ${fnName}(${paramList}):\n${body}`;
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ALGO_RETURN] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator,
  ) {
    const val = generator.valueToCode(block, 'VALUE', Order.NONE);
    return val ? `return ${val}\n` : 'return\n';
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ALGO_CALL_FUNC] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator,
  ) {
    const fnName = sanitizeIdent(block.getFieldValue('NAME') as string | null, 'harvest_plot');
    const arg = generator.valueToCode(block, 'ARG', Order.NONE);
    return arg ? `${fnName}(${arg})\n` : `${fnName}()\n`;
  };

  generatorsRegistered = true;
}

/**
 * Transpiles the given workspace to clean, idiomatic PEP 8 Python code.
 */
export function transpileWorkspaceToPython(workspace: Blockly.Workspace): string {
  registerPythonGenerators();
  return pythonGenerator.workspaceToCode(workspace);
}
