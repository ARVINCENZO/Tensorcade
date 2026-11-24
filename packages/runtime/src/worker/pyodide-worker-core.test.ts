import { describe, it, expect, beforeAll } from 'vitest';
import { Worker as ThreadWorker } from 'node:worker_threads';
import { PyodideWorkerCore } from './pyodide-worker-core.js';
import { PYODIDE_VERSION } from '../types.js';

describe('PyodideWorkerCore', () => {
  let core: PyodideWorkerCore;

  beforeAll(async () => {
    core = new PyodideWorkerCore();
    await core.initRuntime({ baseUrl: '', memoryLimitMb: 512, preloadPackages: [] });
  }, 30000); // 30s timeout for initial Pyodide WASM cold load in Node

  it('initializes CPython 3.14 and reports pinned Pyodide 314.0.8 version', () => {
    expect(core.isInitialized()).toBe(true);
    expect(core.getMemoryUsageMb()).toBeGreaterThan(0);
    expect(PYODIDE_VERSION).toBe('314.0.8');
  });

  it('executes basic Python code and captures in-memory stdout', async () => {
    const response = await core.executeCode({
      code: 'print("Hello from Tensorcade Python runtime!")\nx = 2 + 3\nprint("sum:", x)',
      levelId: 'w1-robot-farm-1.1',
      seed: 42,
      timeoutMs: 5000,
      mockEnv: {},
    });

    expect(response.success).toBe(true);
    expect(response.stdout).toContain('Hello from Tensorcade Python runtime!');
    expect(response.stdout).toContain('sum: 5');
    expect(response.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('intercepts built-in game actions and constructs canonical ActionTrace', async () => {
    const code = ['step()', 'turn_right()', 'step()', 'harvest()'].join('\n');

    const response = await core.executeCode({
      code,
      levelId: 'w1-robot-farm-1.1',
      seed: 42,
      timeoutMs: 5000,
      mockEnv: {},
    });

    expect(response.success).toBe(true);
    expect(response.actionTrace).toBeDefined();
    expect(response.actionTrace?.levelId).toBe('w1-robot-farm-1.1');
    expect(response.actionTrace?.actions).toHaveLength(4);
    expect(response.actionTrace?.actions[0]?.type).toBe('MOVE_FORWARD');
    expect(response.actionTrace?.actions[1]?.type).toBe('TURN_RIGHT');
    expect(response.actionTrace?.actions[2]?.type).toBe('MOVE_FORWARD');
    expect(response.actionTrace?.actions[3]?.type).toBe('HARVEST');
  });

  it('truncates excessive stdout when output size cap is exceeded', async () => {
    const code = 'for i in range(500):\n    print("line " + str(i) + " " + "A" * 50)';

    const response = await core.executeCode({
      code,
      levelId: 'w1-robot-farm-1.1',
      seed: 42,
      timeoutMs: 5000,
      mockEnv: {},
      options: {
        timeoutMs: 5000,
        maxOutputLength: 200,
      },
    });

    expect(response.outputTruncated).toBe(true);
    expect(response.stdout).toContain('[Output truncated: maximum size limit reached]');
  });

  it('traps runtime exceptions and returns 4-part pedagogical feedback', async () => {
    const code = 'items = [10, 20]\nx = items[5]\n';

    const response = await core.executeCode({
      code,
      levelId: 'w1-robot-farm-1.1',
      seed: 42,
      timeoutMs: 5000,
      mockEnv: {},
    });

    expect(response.success).toBe(false);
    expect(response.diagnosticError).toBeDefined();
    expect(response.diagnosticError?.errorType).toBe('IndexError');
    expect(response.diagnosticError?.whereItOccurred.line).toBe(2);
    expect(response.diagnosticError?.whatHappened).toContain('List index out of range');
  });

  it('interrupts non-terminating loops using SharedArrayBuffer interrupt buffer', async () => {
    const buffer = new SharedArrayBuffer(4);
    core.setInterruptBuffer(buffer);

    // Spawn a background thread that repeatedly asserts SIGINT until terminated,
    // preventing race conditions on contended CI runners if initial setup exceeds 100ms.
    const thread = new ThreadWorker(
      'const { workerData } = require("node:worker_threads"); const view = new Int32Array(workerData); setTimeout(() => { Atomics.store(view, 0, 2); setInterval(() => { Atomics.store(view, 0, 2); }, 50); }, 100);',
      { eval: true, workerData: buffer },
    );

    const startTime = Date.now();
    let response;
    try {
      response = await core.executeCode({
        code: 'while True:\n    pass\n',
        levelId: 'w1-robot-farm-1.1',
        seed: 42,
        timeoutMs: 5000,
        mockEnv: {},
      });
    } finally {
      await thread.terminate();
    }

    const elapsed = Date.now() - startTime;

    expect(response.success).toBe(false);
    expect(response.diagnosticError).toBeDefined();
    expect(response.diagnosticError?.errorType).toBe('KeyboardInterrupt');
    // Must halt quickly (under 2500ms, well below the 5000ms hard ceiling)
    expect(elapsed).toBeLessThan(2500);
  });

  it('contains memory allocation exhaustion and maps to MemoryError diagnostic', async () => {
    const code = 'x = [0] * (10**9)\n';

    const response = await core.executeCode({
      code,
      levelId: 'w1-robot-farm-1.1',
      seed: 42,
      timeoutMs: 5000,
      mockEnv: {},
    });

    expect(response.success).toBe(false);
    expect(response.diagnosticError).toBeDefined();
    expect(response.diagnosticError?.errorType).toBe('MemoryError');
    expect(response.diagnosticError?.whatHappened).toContain('Memory allocation limit exceeded');
  });

  it('enforces maximum action limit and halts runaway action loops with RuntimeError', async () => {
    const code = 'for _ in range(2500):\n    step()\n';

    const response = await core.executeCode({
      code,
      levelId: 'w1-robot-farm-1.1',
      seed: 42,
      timeoutMs: 5000,
      mockEnv: {},
    });

    expect(response.success).toBe(false);
    expect(response.diagnosticError).toBeDefined();
    expect(response.diagnosticError?.errorType).toBe('RuntimeError');
    expect(response.diagnosticError?.whatHappened).toContain('Maximum action limit exceeded');
  });

  it('caps Matplotlib figure extraction to at most 5 figures', async () => {
    const code = [
      'import sys, types',
      'mock_plt = types.ModuleType("matplotlib.pyplot")',
      'class MockFig:',
      '    def savefig(self, buf, **kwargs): buf.write(b"PNGDATA")',
      'mock_plt.get_fignums = lambda: list(range(1, 15))',
      'mock_plt.figure = lambda n: MockFig()',
      'mock_plt.close = lambda all: None',
      'sys.modules["matplotlib.pyplot"] = mock_plt',
    ].join('\n');

    const response = await core.executeCode({
      code,
      levelId: 'w1-robot-farm-1.1',
      seed: 42,
      timeoutMs: 5000,
      mockEnv: {},
    });

    expect(response.success).toBe(true);
    expect(response.figures).toBeDefined();
    expect(response.figures?.length).toBe(5);

    // Clean up mock module
    await core.executeCode({
      code: 'import sys; sys.modules.pop("matplotlib.pyplot", None)',
      levelId: 'w1-robot-farm-1.1',
      seed: 42,
      timeoutMs: 5000,
      mockEnv: {},
    });
  });
});
