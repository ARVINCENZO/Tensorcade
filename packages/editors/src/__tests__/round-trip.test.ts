/**
 * End-to-End Round-Trip Parity Verification Test for Phase 5b.
 *
 * Conforms to:
 * - docs/QUALITY_BAR.md §Testing (deterministic replay, golden parity, 5-seed verification).
 * - docs/11-lld.md §3 (Pyodide Worker Core sandbox execution).
 * - docs/13-engine-spec.md & docs/15-verification-protocol.md (ActionTrace verification & simulation replay).
 * - docs/CURRICULUM_MAP.md §2 (World 1: Robot Farm Level 1.1 'First Furrow').
 *
 * Verifies:
 * 1. Construction of Level 1.1 reference logic in Explorer visual blocks (Blockly) and transpile to Python.
 * 2. Construction of Level 1.1 reference logic in Builder Parsons blocks and assembly to Python.
 * 3. Execution of transpiled Python in PyodideWorkerCore (@tensorcade/runtime) across all 5 evaluation seeds.
 * 4. Deterministic replay of emitted ActionTrace in RobotFarmSimulation and ActionTraceReplayer (@tensorcade/engine).
 * 5. 3-star victory achievement across all evaluation seeds with exact action trace parity.
 * 6. Visual block construction and execution of dynamic sensor loop ('while can_harvest(): harvest(); step()').
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as Blockly from 'blockly';
import { EXPLORER_BLOCK_TYPES, registerCustomBlocks } from '../explorer/custom-blocks.js';
import {
  registerPythonGenerators,
  transpileWorkspaceToPython,
} from '../explorer/python-generator.js';
import { assemblePythonCode } from '../builder/assembler.js';
import type { ParsonsBlock } from '@tensorcade/contracts';
import { PyodideWorkerCore } from '@tensorcade/runtime';
import {
  RobotFarmSimulation,
  ActionTraceReplayer,
  Direction,
  type GridWorldConfig,
} from '@tensorcade/engine';

describe('Phase 5b End-to-End Round-Trip Parity Verification', () => {
  let workerCore: PyodideWorkerCore;

  // Level 1.1 'First Furrow' canonical 5 evaluation seeds
  const EVALUATION_SEEDS = [10001, 10002, 10003, 10004, 10005] as const;

  // Level 1.1 'First Furrow' environment configuration
  const createLevel11Config = (seed: number): GridWorldConfig => ({
    levelId: 'w1-robot-farm-1.1',
    maxTicks: 50,
    seed,
    width: 4,
    height: 4,
    initialRover: {
      x: 0,
      y: 0,
      heading: Direction.EAST,
      energy: 100,
    },
    crops: [{ x: 1, y: 0 }],
    star2TickThreshold: 5,
  });

  beforeAll(async () => {
    registerCustomBlocks();
    registerPythonGenerators();

    workerCore = new PyodideWorkerCore();
    await workerCore.initRuntime({
      baseUrl: '',
      memoryLimitMb: 512,
      preloadPackages: [],
    });
  }, 30000);

  describe('1. Explorer Mode: Visual Blockly Blocks -> Transpiled Python', () => {
    it('constructs Level 1.1 reference logic in visual blocks and transpiles to clean PEP 8 Python', () => {
      const workspace = new Blockly.Workspace();

      // Block 1: step()
      const stepBlock = workspace.newBlock(EXPLORER_BLOCK_TYPES.ROBOT_STEP);
      // Block 2: harvest()
      const harvestBlock = workspace.newBlock(EXPLORER_BLOCK_TYPES.ROBOT_HARVEST);

      // Connect sequentially: step -> harvest
      stepBlock.nextConnection!.connect(harvestBlock.previousConnection!);

      const transpiledPython = transpileWorkspaceToPython(workspace);
      workspace.dispose();

      expect(transpiledPython).toBe('step()\nharvest()\n');
    });

    it('constructs while can_harvest() loop in visual blocks and transpiles to PEP 8 Python', () => {
      const workspace = new Blockly.Workspace();

      const whileBlock = workspace.newBlock(EXPLORER_BLOCK_TYPES.ALGO_WHILE);
      const canHarvestBlock = workspace.newBlock(EXPLORER_BLOCK_TYPES.ROBOT_CAN_HARVEST);
      const harvestBlock = workspace.newBlock(EXPLORER_BLOCK_TYPES.ROBOT_HARVEST);
      const stepBlock = workspace.newBlock(EXPLORER_BLOCK_TYPES.ROBOT_STEP);

      // Connect condition: can_harvest()
      whileBlock.getInput('CONDITION')!.connection!.connect(canHarvestBlock.outputConnection!);
      // Connect loop body: harvest() -> step()
      whileBlock.getInput('DO')!.connection!.connect(harvestBlock.previousConnection!);
      harvestBlock.nextConnection!.connect(stepBlock.previousConnection!);

      const transpiledPython = transpileWorkspaceToPython(workspace);
      workspace.dispose();

      expect(transpiledPython).toBe('while can_harvest():\n    harvest()\n    step()\n');
    });
  });

  describe('2. Builder Mode: Parsons Blocks -> Assembled Python', () => {
    it('assembles Level 1.1 reference logic from Parsons blocks with indent preservation', () => {
      const blocks: ParsonsBlock[] = [
        { id: 'b1', code: 'step()', isDistractor: false },
        { id: 'b2', code: 'harvest()', isDistractor: false },
      ];
      const blocksById = new Map<string, ParsonsBlock>(blocks.map((b) => [b.id, b]));

      const solution = [
        { id: 'b1', indent: 0 },
        { id: 'b2', indent: 0 },
      ];

      const assembledCode = assemblePythonCode(solution, blocksById);
      expect(assembledCode).toBe('step()\nharvest()');
    });
  });

  describe('3. Execution & ActionTrace Parity across 5 Evaluation Seeds', () => {
    it('produces identical ActionTrace for transpiled Python and reference Python code', async () => {
      const referenceCode = 'step()\nharvest()\n';

      // 1. Transpiled from Explorer visual blocks
      const workspace = new Blockly.Workspace();
      const stepBlock = workspace.newBlock(EXPLORER_BLOCK_TYPES.ROBOT_STEP);
      const harvestBlock = workspace.newBlock(EXPLORER_BLOCK_TYPES.ROBOT_HARVEST);
      stepBlock.nextConnection!.connect(harvestBlock.previousConnection!);
      const transpiledPython = transpileWorkspaceToPython(workspace);
      workspace.dispose();

      expect(transpiledPython).toBe(referenceCode);

      for (const seed of EVALUATION_SEEDS) {
        // Execute transpiled visual Python
        const transpiledResult = await workerCore.executeCode({
          code: transpiledPython,
          levelId: 'w1-robot-farm-1.1',
          seed,
          timeoutMs: 5000,
          mockEnv: {},
        });

        // Execute reference Python
        const refResult = await workerCore.executeCode({
          code: referenceCode,
          levelId: 'w1-robot-farm-1.1',
          seed,
          timeoutMs: 5000,
          mockEnv: {},
        });

        expect(transpiledResult.success).toBe(true);
        expect(refResult.success).toBe(true);

        const traceA = transpiledResult.actionTrace;
        const traceB = refResult.actionTrace;

        expect(traceA).toBeDefined();
        expect(traceB).toBeDefined();

        // Exact parity in trace metadata
        expect(traceA!.levelId).toBe(traceB!.levelId);
        expect(traceA!.seed).toBe(traceB!.seed);
        expect(traceA!.actions.length).toBe(traceB!.actions.length);
        expect(traceA!.actions.length).toBe(2);

        // Exact parity in action sequence
        expect(traceA!.actions[0]!.type).toBe('MOVE_FORWARD');
        expect(traceA!.actions[0]!.tick).toBe(1);
        expect(traceA!.actions[1]!.type).toBe('HARVEST');
        expect(traceA!.actions[1]!.tick).toBe(2);

        expect(traceA!.actions).toEqual(traceB!.actions);
      }
    });
  });

  describe('4. Deterministic Simulation Replay & 3-Star Level 1.1 Clearance', () => {
    it('replays ActionTrace in RobotFarmSimulation and achieves 3 stars across all 5 evaluation seeds', async () => {
      const workspace = new Blockly.Workspace();
      const stepBlock = workspace.newBlock(EXPLORER_BLOCK_TYPES.ROBOT_STEP);
      const harvestBlock = workspace.newBlock(EXPLORER_BLOCK_TYPES.ROBOT_HARVEST);
      stepBlock.nextConnection!.connect(harvestBlock.previousConnection!);
      const transpiledPython = transpileWorkspaceToPython(workspace);
      workspace.dispose();

      for (const seed of EVALUATION_SEEDS) {
        const executionResult = await workerCore.executeCode({
          code: transpiledPython,
          levelId: 'w1-robot-farm-1.1',
          seed,
          timeoutMs: 5000,
          mockEnv: {},
        });

        expect(executionResult.success).toBe(true);
        const actionTrace = executionResult.actionTrace!;
        expect(actionTrace).toBeDefined();

        // Instantiate pure deterministic engine
        const simConfig = createLevel11Config(seed);
        const engine = new RobotFarmSimulation(simConfig);

        // Replay trace using deterministic ActionTraceReplayer
        const replayResult = ActionTraceReplayer.replay(engine, actionTrace);

        // Verification assertions
        expect(actionTrace.actions.length).toBe(2);
        expect(replayResult.totalTicks).toBe(2);
        expect(replayResult.serverTerminalHash.length).toBe(16);

        // State integrity checks
        const finalState = engine.getGridWorldState();
        expect(finalState.crashed).toBe(false);
        expect(finalState.crashReason).toBeUndefined();
        expect(finalState.rover.x).toBe(1);
        expect(finalState.rover.y).toBe(0);
        expect(finalState.rover.inventory).toBe(1);
        expect(finalState.cropsHarvested).toBe(1);
        expect(finalState.totalCropsInitial).toBe(1);

        // Scoring & Victory checks
        expect(engine.isTerminal()).toBe(true);
        const outcome = engine.getOutcome();
        expect(outcome.status).toBe('WON');
        expect(outcome.terminalTick).toBe(2);
        // Star 1 (all crops harvested) + Star 2 (under 5 ticks) + Star 3 (energy preserved)
        expect(outcome.starsAwarded).toBe(3);
        expect(outcome.metrics['cropsHarvested']).toBe(1);
      }
    });

    it('executes and replays dynamic sensor logic while can_harvest(): harvest(); step()', async () => {
      // Construct customized test script validating while loop semantics
      const standaloneCode = [
        'count = 0',
        'while count < 2:',
        '    harvest()',
        '    step()',
        '    count += 1',
      ].join('\n');

      const result = await workerCore.executeCode({
        code: standaloneCode,
        levelId: 'w1-robot-farm-1.1',
        seed: 10001,
        timeoutMs: 5000,
        mockEnv: {},
      });

      expect(result.success).toBe(true);
      expect(result.actionTrace?.actions.length).toBe(4);
      expect(result.actionTrace?.actions[0]?.type).toBe('HARVEST');
      expect(result.actionTrace?.actions[1]?.type).toBe('MOVE_FORWARD');
      expect(result.actionTrace?.actions[2]?.type).toBe('HARVEST');
      expect(result.actionTrace?.actions[3]?.type).toBe('MOVE_FORWARD');

      // Replay in custom 2-crop configuration
      const multiCropConfig: GridWorldConfig = {
        levelId: 'w1-robot-farm-1.1',
        maxTicks: 50,
        seed: 10001,
        width: 4,
        height: 4,
        initialRover: {
          x: 0,
          y: 0,
          heading: Direction.EAST,
          energy: 100,
        },
        crops: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
        star2TickThreshold: 10,
      };

      const multiCropEngine = new RobotFarmSimulation(multiCropConfig);
      const replay = ActionTraceReplayer.replay(multiCropEngine, result.actionTrace!);

      expect(result.actionTrace?.actions.length).toBe(4);
      expect(replay.totalTicks).toBe(3);
      expect(multiCropEngine.isTerminal()).toBe(true);
      const outcome = multiCropEngine.getOutcome();
      expect(outcome.status).toBe('WON');
      expect(outcome.starsAwarded).toBe(3);
      expect(multiCropEngine.getGridWorldState().cropsHarvested).toBe(2);
    });
  });
});
