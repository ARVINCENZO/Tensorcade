// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import * as Blockly from 'blockly';
import {
  EXPLORER_BLOCK_TYPES,
  registerCustomBlocks,
  customBlockDefinitions,
} from './custom-blocks.js';
import { registerPythonGenerators, transpileWorkspaceToPython } from './python-generator.js';
import { tensorcadeDarkTheme } from './token-theme.js';
import { defaultToolboxJson, defaultToolboxXml } from './toolbox.js';
import { CodePreviewPane } from './CodePreviewPane.js';
import { ExplorerEditor } from './ExplorerEditor.js';

describe('Blockly Explorer Editor (Sub-step 5b.2)', () => {
  beforeEach(() => {
    registerCustomBlocks();
    registerPythonGenerators();
  });

  describe('1. Custom Block Definitions', () => {
    it('registers all required game API blocks in Blockly registry', () => {
      expect(Blockly.Blocks[EXPLORER_BLOCK_TYPES.ROBOT_STEP]).toBeDefined();
      expect(Blockly.Blocks[EXPLORER_BLOCK_TYPES.ROBOT_TURN_LEFT]).toBeDefined();
      expect(Blockly.Blocks[EXPLORER_BLOCK_TYPES.ROBOT_TURN_RIGHT]).toBeDefined();
      expect(Blockly.Blocks[EXPLORER_BLOCK_TYPES.ROBOT_HARVEST]).toBeDefined();
      expect(Blockly.Blocks[EXPLORER_BLOCK_TYPES.ROBOT_WAIT]).toBeDefined();
    });

    it('registers sensor and query blocks', () => {
      expect(Blockly.Blocks[EXPLORER_BLOCK_TYPES.ROBOT_IS_FRONT_CLEAR]).toBeDefined();
      expect(Blockly.Blocks[EXPLORER_BLOCK_TYPES.ROBOT_CAN_HARVEST]).toBeDefined();
    });

    it('registers algorithmic control blocks (loops, conditionals, math)', () => {
      expect(Blockly.Blocks[EXPLORER_BLOCK_TYPES.ALGO_REPEAT]).toBeDefined();
      expect(Blockly.Blocks[EXPLORER_BLOCK_TYPES.ALGO_WHILE]).toBeDefined();
      expect(Blockly.Blocks[EXPLORER_BLOCK_TYPES.ALGO_IF]).toBeDefined();
      expect(Blockly.Blocks[EXPLORER_BLOCK_TYPES.ALGO_IF_ELSE]).toBeDefined();
      expect(Blockly.Blocks[EXPLORER_BLOCK_TYPES.ALGO_NUMBER]).toBeDefined();
      expect(Blockly.Blocks[EXPLORER_BLOCK_TYPES.ALGO_COMPARE]).toBeDefined();
    });

    it('defines blocks with proper statement connections and colors', () => {
      const stepDef = customBlockDefinitions.find(
        (b) => b.type === EXPLORER_BLOCK_TYPES.ROBOT_STEP,
      );
      expect(stepDef).toBeDefined();
      expect(stepDef?.previousStatement).toBeNull();
      expect(stepDef?.nextStatement).toBeNull();
      expect(stepDef?.colour).toBe('#38BDF8');
    });
  });

  describe('2. Python Code Generation (PEP 8 Compliance)', () => {
    it('transpiles robot_step to step()', () => {
      const ws = new Blockly.Workspace();
      ws.newBlock(EXPLORER_BLOCK_TYPES.ROBOT_STEP);
      const code = transpileWorkspaceToPython(ws);
      expect(code.trim()).toBe('step()');
      ws.dispose();
    });

    it('transpiles robot_turn_left to turn_left()', () => {
      const ws = new Blockly.Workspace();
      ws.newBlock(EXPLORER_BLOCK_TYPES.ROBOT_TURN_LEFT);
      const code = transpileWorkspaceToPython(ws);
      expect(code.trim()).toBe('turn_left()');
      ws.dispose();
    });

    it('transpiles robot_turn_right to turn_right()', () => {
      const ws = new Blockly.Workspace();
      ws.newBlock(EXPLORER_BLOCK_TYPES.ROBOT_TURN_RIGHT);
      const code = transpileWorkspaceToPython(ws);
      expect(code.trim()).toBe('turn_right()');
      ws.dispose();
    });

    it('transpiles robot_harvest to harvest()', () => {
      const ws = new Blockly.Workspace();
      ws.newBlock(EXPLORER_BLOCK_TYPES.ROBOT_HARVEST);
      const code = transpileWorkspaceToPython(ws);
      expect(code.trim()).toBe('harvest()');
      ws.dispose();
    });

    it('transpiles robot_wait to wait()', () => {
      const ws = new Blockly.Workspace();
      ws.newBlock(EXPLORER_BLOCK_TYPES.ROBOT_WAIT);
      const code = transpileWorkspaceToPython(ws);
      expect(code.trim()).toBe('wait()');
      ws.dispose();
    });

    it('transpiles sequential action blocks with clean newlines', () => {
      const ws = new Blockly.Workspace();
      const step1 = ws.newBlock(EXPLORER_BLOCK_TYPES.ROBOT_STEP);
      const turn = ws.newBlock(EXPLORER_BLOCK_TYPES.ROBOT_TURN_LEFT);
      const step2 = ws.newBlock(EXPLORER_BLOCK_TYPES.ROBOT_STEP);

      step1.nextConnection!.connect(turn.previousConnection!);
      turn.nextConnection!.connect(step2.previousConnection!);

      const code = transpileWorkspaceToPython(ws);
      expect(code).toBe('step()\nturn_left()\nstep()\n');
      ws.dispose();
    });

    it('transpiles algo_repeat with nested actions and 4-space indentation', () => {
      const ws = new Blockly.Workspace();
      const loop = ws.newBlock(EXPLORER_BLOCK_TYPES.ALGO_REPEAT);
      loop.setFieldValue('3', 'TIMES');

      const step = ws.newBlock(EXPLORER_BLOCK_TYPES.ROBOT_STEP);
      loop.getInput('DO')!.connection!.connect(step.previousConnection!);

      const code = transpileWorkspaceToPython(ws);
      expect(code).toBe('for _ in range(3):\n    step()\n');
      ws.dispose();
    });

    it('transpiles empty loop bodies to PEP 8 pass statement', () => {
      const ws = new Blockly.Workspace();
      const loop = ws.newBlock(EXPLORER_BLOCK_TYPES.ALGO_REPEAT);
      loop.setFieldValue('5', 'TIMES');

      const code = transpileWorkspaceToPython(ws);
      expect(code).toBe('for _ in range(5):\n    pass\n');
      ws.dispose();
    });

    it('transpiles algo_while with sensor condition', () => {
      const ws = new Blockly.Workspace();
      const loop = ws.newBlock(EXPLORER_BLOCK_TYPES.ALGO_WHILE);
      const sensor = ws.newBlock(EXPLORER_BLOCK_TYPES.ROBOT_IS_FRONT_CLEAR);
      const step = ws.newBlock(EXPLORER_BLOCK_TYPES.ROBOT_STEP);

      loop.getInput('CONDITION')!.connection!.connect(sensor.outputConnection!);
      loop.getInput('DO')!.connection!.connect(step.previousConnection!);

      const code = transpileWorkspaceToPython(ws);
      expect(code).toBe('while is_front_clear():\n    step()\n');
      ws.dispose();
    });

    it('transpiles algo_if with sensor condition and harvest action', () => {
      const ws = new Blockly.Workspace();
      const ifBlock = ws.newBlock(EXPLORER_BLOCK_TYPES.ALGO_IF);
      const sensor = ws.newBlock(EXPLORER_BLOCK_TYPES.ROBOT_CAN_HARVEST);
      const harvest = ws.newBlock(EXPLORER_BLOCK_TYPES.ROBOT_HARVEST);

      ifBlock.getInput('CONDITION')!.connection!.connect(sensor.outputConnection!);
      ifBlock.getInput('DO')!.connection!.connect(harvest.previousConnection!);

      const code = transpileWorkspaceToPython(ws);
      expect(code).toBe('if can_harvest():\n    harvest()\n');
      ws.dispose();
    });

    it('transpiles algo_if_else with both branches', () => {
      const ws = new Blockly.Workspace();
      const ifElse = ws.newBlock(EXPLORER_BLOCK_TYPES.ALGO_IF_ELSE);
      const sensor = ws.newBlock(EXPLORER_BLOCK_TYPES.ROBOT_IS_FRONT_CLEAR);
      const step = ws.newBlock(EXPLORER_BLOCK_TYPES.ROBOT_STEP);
      const turn = ws.newBlock(EXPLORER_BLOCK_TYPES.ROBOT_TURN_RIGHT);

      ifElse.getInput('CONDITION')!.connection!.connect(sensor.outputConnection!);
      ifElse.getInput('DO')!.connection!.connect(step.previousConnection!);
      ifElse.getInput('ELSE')!.connection!.connect(turn.previousConnection!);

      const code = transpileWorkspaceToPython(ws);
      expect(code).toBe('if is_front_clear():\n    step()\nelse:\n    turn_right()\n');
      ws.dispose();
    });

    it('transpiles comparison block', () => {
      const ws = new Blockly.Workspace();
      const compare = ws.newBlock(EXPLORER_BLOCK_TYPES.ALGO_COMPARE);
      compare.setFieldValue('LT', 'OP');
      const num1 = ws.newBlock(EXPLORER_BLOCK_TYPES.ALGO_NUMBER);
      num1.setFieldValue('2', 'NUM');
      const num2 = ws.newBlock(EXPLORER_BLOCK_TYPES.ALGO_NUMBER);
      num2.setFieldValue('5', 'NUM');

      compare.getInput('A')!.connection!.connect(num1.outputConnection!);
      compare.getInput('B')!.connection!.connect(num2.outputConnection!);

      const ifBlock = ws.newBlock(EXPLORER_BLOCK_TYPES.ALGO_IF);
      ifBlock.getInput('CONDITION')!.connection!.connect(compare.outputConnection!);

      const code = transpileWorkspaceToPython(ws);
      expect(code).toContain('if 2 < 5:\n');
      ws.dispose();
    });

    it('supports standard Blockly blocks with 4-space indent', () => {
      const ws = new Blockly.Workspace();
      ws.newBlock('controls_repeat_ext');
      const code = transpileWorkspaceToPython(ws);
      expect(code).toContain('for count in range(0):\n    pass\n');
      ws.dispose();
    });

    it('transpiles Robot Farm sensors, 0-based list indexing, if/elif/else, and def/return cleanly', () => {
      const ws = new Blockly.Workspace();
      const fnDef = ws.newBlock(EXPLORER_BLOCK_TYPES.ALGO_DEF_FUNC);
      fnDef.setFieldValue('harvest_plot', 'NAME');
      fnDef.setFieldValue('length', 'PARAM');

      const repeatExpr = ws.newBlock(EXPLORER_BLOCK_TYPES.ALGO_REPEAT_EXPR);
      const paramGet = ws.newBlock(EXPLORER_BLOCK_TYPES.ALGO_VAR_GET);
      paramGet.setFieldValue('length', 'VAR');
      repeatExpr.getInput('TIMES')!.connection!.connect(paramGet.outputConnection!);

      const stepBlk = ws.newBlock(EXPLORER_BLOCK_TYPES.ROBOT_STEP);
      repeatExpr.getInput('DO')!.connection!.connect(stepBlk.previousConnection!);

      const retBlk = ws.newBlock(EXPLORER_BLOCK_TYPES.ALGO_RETURN);
      const lenBlk = ws.newBlock(EXPLORER_BLOCK_TYPES.ALGO_LEN);
      const plotsBlk = ws.newBlock(EXPLORER_BLOCK_TYPES.ROBOT_GET_PLOT_LENGTHS);
      lenBlk.getInput('LIST')!.connection!.connect(plotsBlk.outputConnection!);
      retBlk.getInput('VALUE')!.connection!.connect(lenBlk.outputConnection!);

      fnDef.getInput('BODY')!.connection!.connect(repeatExpr.previousConnection!);
      repeatExpr.nextConnection!.connect(retBlk.previousConnection!);

      const callBlk = ws.newBlock(EXPLORER_BLOCK_TYPES.ALGO_CALL_FUNC);
      callBlk.setFieldValue('harvest_plot', 'NAME');
      const listGet = ws.newBlock(EXPLORER_BLOCK_TYPES.ALGO_LIST_GET);
      const plots2 = ws.newBlock(EXPLORER_BLOCK_TYPES.ROBOT_GET_PLOT_LENGTHS);
      const zero = ws.newBlock(EXPLORER_BLOCK_TYPES.ALGO_NUMBER);
      zero.setFieldValue('0', 'NUM');
      listGet.getInput('LIST')!.connection!.connect(plots2.outputConnection!);
      listGet.getInput('INDEX')!.connection!.connect(zero.outputConnection!);
      callBlk.getInput('ARG')!.connection!.connect(listGet.outputConnection!);
      fnDef.nextConnection!.connect(callBlk.previousConnection!);

      const code = transpileWorkspaceToPython(ws);
      ws.dispose();

      expect(code).toContain('def harvest_plot(length):');
      expect(code).toContain('    for _ in range(length):');
      expect(code).toContain('        step()');
      expect(code).toContain('    return len(get_plot_lengths())');
      expect(code).toContain('harvest_plot(get_plot_lengths()[0])');
    });
  });

  describe('3. Token Theme & Toolbox Configuration', () => {
    it('defines tensorcade-dark theme with #0B0F17 workspace and #111827 flyout', () => {
      expect(tensorcadeDarkTheme.name).toBe('tensorcade-dark');
      const styles = tensorcadeDarkTheme.componentStyles;
      expect(styles['workspaceBackgroundColour']).toBe('#0B0F17');
      expect(styles['flyoutBackgroundColour']).toBe('#111827');
      expect(styles['toolboxBackgroundColour']).toBe('#111827');
      expect(styles['insertionMarkerColour']).toBe('#38BDF8');
    });

    it('defines category colors matching token palette', () => {
      const categories = tensorcadeDarkTheme.categoryStyles;
      expect(categories['game_category']?.colour).toBe('#38BDF8');
      expect(categories['loop_category']?.colour).toBe('#10B981');
      expect(categories['logic_category']?.colour).toBe('#F59E0B');
      expect(categories['math_category']?.colour).toBe('#A5B4FC');
      expect(categories['variable_category']?.colour).toBe('#FB7185');
    });

    it('provides both JSON and XML default toolboxes containing required categories', () => {
      expect(defaultToolboxJson.kind).toBe('categoryToolbox');
      const categoryNames = defaultToolboxJson.contents.map((c) => c.name);
      expect(categoryNames).toContain('Actions');
      expect(categoryNames).toContain('Loops');
      expect(categoryNames).toContain('Logic');
      expect(categoryNames).toContain('Math');
      expect(categoryNames).toContain('Variables');

      expect(defaultToolboxXml).toContain('category name="Actions"');
      expect(defaultToolboxXml).toContain('robot_step');
    });
  });

  describe('4. Component Layout & Accessibility', () => {
    it('renders ExplorerEditor with 60%/40% split layout', () => {
      const html = renderToStaticMarkup(<ExplorerEditor />);
      expect(html).toContain('data-testid="explorer-editor"');
      expect(html).toContain('data-testid="blockly-container"');
      expect(html).toContain('w-[60%]');
      expect(html).toContain('data-testid="code-preview-container"');
      expect(html).toContain('w-[40%]');
    });

    it('renders CodePreviewPane with placeholder when code is empty', () => {
      const html = renderToStaticMarkup(<CodePreviewPane code="" />);
      expect(html).toContain('role="region"');
      expect(html).toContain('aria-label="Transpiled Python code preview"');
      expect(html).toContain('Assembled blocks transpile to live Python code here');
      expect(html).toContain('PEP 8 Live');
    });

    it('renders CodePreviewPane with line numbers and code lines', () => {
      const pythonCode = 'step()\nturn_left()\nharvest()';
      const html = renderToStaticMarkup(<CodePreviewPane code={pythonCode} />);
      expect(html).toContain('data-testid="line-numbers-gutter"');
      expect(html).toContain('step()');
      expect(html).toContain('turn_left()');
      expect(html).toContain('harvest()');
    });

    it('renders execute button when onRun prop is provided', () => {
      const html = renderToStaticMarkup(<ExplorerEditor onRun={() => {}} />);
      expect(html).toContain('data-testid="btn-run-code"');
      expect(html).toContain('Execute');
    });

    it('renders alert when invalid initialXml causes parsing error', () => {
      const onError = vi.fn();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      act(() => {
        root.render(<ExplorerEditor initialXml="<invalid xml" onError={onError} />);
      });

      expect(onError).toHaveBeenCalledTimes(1);
      const alert = container.querySelector('[role="alert"]');
      expect(alert).not.toBeNull();
      expect(alert?.textContent).toContain('Failed to load blocks');

      act(() => {
        root.unmount();
      });
      container.remove();
      consoleErrorSpy.mockRestore();
    });
  });
});
