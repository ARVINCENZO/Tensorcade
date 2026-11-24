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

  // --- Sensors / Conditions ---
  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ROBOT_IS_FRONT_CLEAR] = function () {
    return ['is_front_clear()', Order.FUNCTION_CALL];
  };

  pythonGenerator.forBlock[EXPLORER_BLOCK_TYPES.ROBOT_CAN_HARVEST] = function () {
    return ['can_harvest()', Order.FUNCTION_CALL];
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

  generatorsRegistered = true;
}

/**
 * Transpiles the given workspace to clean, idiomatic PEP 8 Python code.
 */
export function transpileWorkspaceToPython(workspace: Blockly.Workspace): string {
  registerPythonGenerators();
  return pythonGenerator.workspaceToCode(workspace);
}
