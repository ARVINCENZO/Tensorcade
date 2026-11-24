import { colors } from '@tensorcade/ui';
import { EXPLORER_BLOCK_TYPES } from './custom-blocks.js';

/**
 * Default JSON category toolbox for Explorer Blockly editor.
 */
export const defaultToolboxJson = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Actions',
      colour: colors.accent.cyan,
      contents: [
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ROBOT_STEP },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ROBOT_TURN_LEFT },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ROBOT_TURN_RIGHT },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ROBOT_HARVEST },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ROBOT_RECHARGE },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ROBOT_WAIT },
      ],
    },
    {
      kind: 'category',
      name: 'Loops',
      colour: colors.accent.emerald,
      contents: [
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ALGO_REPEAT },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ALGO_REPEAT_EXPR },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ALGO_FOR_INDEX },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ALGO_WHILE },
        { kind: 'block', type: 'controls_repeat_ext' },
        { kind: 'block', type: 'controls_whileUntil' },
      ],
    },
    {
      kind: 'category',
      name: 'Logic',
      colour: colors.accent.amber,
      contents: [
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ROBOT_IS_FRONT_CLEAR },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ROBOT_IS_ROCK_AHEAD },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ROBOT_IS_RAVINE_AHEAD },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ROBOT_CAN_HARVEST },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ROBOT_IS_ON_BASE },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ROBOT_HAS_ENERGY },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ROBOT_IS_FIELD_CLEARED },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ALGO_IF },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ALGO_IF_ELSE },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ALGO_IF_ELIF_ELSE },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ALGO_LOGIC_OP },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ALGO_NOT },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ALGO_COMPARE },
        { kind: 'block', type: 'controls_if' },
        { kind: 'block', type: 'logic_compare' },
        { kind: 'block', type: 'logic_boolean' },
      ],
    },
    {
      kind: 'category',
      name: 'Math',
      colour: colors.accent.indigo,
      contents: [
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ALGO_NUMBER },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ALGO_MATH_OP },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ROBOT_GET_ENERGY },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ROBOT_GET_ROW_LENGTH },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ROBOT_GET_PLOT_LENGTHS },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ALGO_LEN },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ALGO_LIST_GET },
        { kind: 'block', type: 'math_number' },
        { kind: 'block', type: 'math_arithmetic' },
      ],
    },
    {
      kind: 'category',
      name: 'Variables',
      colour: colors.accent.crimson,
      contents: [
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ALGO_VAR_SET },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ALGO_VAR_GET },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ALGO_DEF_FUNC },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ALGO_RETURN },
        { kind: 'block', type: EXPLORER_BLOCK_TYPES.ALGO_CALL_FUNC },
      ],
    },
  ],
};

/**
 * Default XML category toolbox for Explorer Blockly editor.
 */
export const defaultToolboxXml = `
<xml xmlns="https://developers.google.com/blockly/xml" id="toolbox" style="display: none">
  <category name="Actions" colour="${colors.accent.cyan}">
    <block type="${EXPLORER_BLOCK_TYPES.ROBOT_STEP}"></block>
    <block type="${EXPLORER_BLOCK_TYPES.ROBOT_TURN_LEFT}"></block>
    <block type="${EXPLORER_BLOCK_TYPES.ROBOT_TURN_RIGHT}"></block>
    <block type="${EXPLORER_BLOCK_TYPES.ROBOT_HARVEST}"></block>
    <block type="${EXPLORER_BLOCK_TYPES.ROBOT_WAIT}"></block>
  </category>
  <category name="Loops" colour="${colors.accent.emerald}">
    <block type="${EXPLORER_BLOCK_TYPES.ALGO_REPEAT}"></block>
    <block type="${EXPLORER_BLOCK_TYPES.ALGO_WHILE}"></block>
    <block type="controls_repeat_ext"></block>
    <block type="controls_whileUntil"></block>
  </category>
  <category name="Logic" colour="${colors.accent.amber}">
    <block type="${EXPLORER_BLOCK_TYPES.ROBOT_IS_FRONT_CLEAR}"></block>
    <block type="${EXPLORER_BLOCK_TYPES.ROBOT_CAN_HARVEST}"></block>
    <block type="${EXPLORER_BLOCK_TYPES.ALGO_IF}"></block>
    <block type="${EXPLORER_BLOCK_TYPES.ALGO_IF_ELSE}"></block>
    <block type="${EXPLORER_BLOCK_TYPES.ALGO_COMPARE}"></block>
    <block type="controls_if"></block>
  </category>
  <category name="Math" colour="${colors.accent.indigo}">
    <block type="${EXPLORER_BLOCK_TYPES.ALGO_NUMBER}"></block>
    <block type="math_number"></block>
    <block type="math_arithmetic"></block>
  </category>
  <category name="Variables" custom="VARIABLE" colour="${colors.accent.crimson}"></category>
</xml>
`.trim();
