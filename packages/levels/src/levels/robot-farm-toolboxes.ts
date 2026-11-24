/**
 * Progressive Blockly category toolboxes for Robot Farm Levels 1.1 through 1.12.
 * Uses Tensorcade theme categorystyle keys (zero raw hex values).
 */

interface ToolboxBlock {
  kind: 'block';
  type: string;
}

interface ToolboxCategory {
  kind: 'category';
  name: string;
  categorystyle:
    'game_category' | 'loop_category' | 'logic_category' | 'math_category' | 'variable_category';
  contents: ToolboxBlock[];
}

export interface RobotFarmToolbox {
  [key: string]: unknown;
  kind: 'categoryToolbox';
  contents: ToolboxCategory[];
}

function blocks(types: ReadonlyArray<string>): ToolboxBlock[] {
  return types.map((type) => ({ kind: 'block', type }));
}

export function createRobotFarmToolbox(options: {
  actions: ReadonlyArray<string>;
  loops?: ReadonlyArray<string>;
  logic?: ReadonlyArray<string>;
  math?: ReadonlyArray<string>;
  variables?: ReadonlyArray<string>;
}): RobotFarmToolbox {
  const contents: ToolboxCategory[] = [
    {
      kind: 'category',
      name: 'Actions',
      categorystyle: 'game_category',
      contents: blocks(options.actions),
    },
  ];

  if (options.loops && options.loops.length > 0) {
    contents.push({
      kind: 'category',
      name: 'Loops',
      categorystyle: 'loop_category',
      contents: blocks(options.loops),
    });
  }

  if (options.logic && options.logic.length > 0) {
    contents.push({
      kind: 'category',
      name: 'Logic',
      categorystyle: 'logic_category',
      contents: blocks(options.logic),
    });
  }

  if (options.math && options.math.length > 0) {
    contents.push({
      kind: 'category',
      name: 'Math & Survey',
      categorystyle: 'math_category',
      contents: blocks(options.math),
    });
  }

  if (options.variables && options.variables.length > 0) {
    contents.push({
      kind: 'category',
      name: 'Variables & Functions',
      categorystyle: 'variable_category',
      contents: blocks(options.variables),
    });
  }

  return {
    kind: 'categoryToolbox',
    contents,
  };
}
