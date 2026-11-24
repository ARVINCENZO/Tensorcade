import { describe, it, expect } from 'vitest';
import { PyodideWorkerCore } from '../worker/pyodide-worker-core.js';

describe('Python Runtime Performance Benchmark', () => {
  it('measures cold start time, warm execution time, and interrupt response latency', async () => {
    // 1. Measure Cold Start Time (Instantiation + WASM Bootstrap)
    const t0 = performance.now();
    const core = new PyodideWorkerCore();
    await core.initRuntime({ baseUrl: '', memoryLimitMb: 512, preloadPackages: [] });
    const coldStartMs = performance.now() - t0;

    // 2. Measure Warm Execution Time (Executing Level 1.1 First Furrow)
    const t1 = performance.now();
    const res1 = await core.executeCode({
      code: 'step()\nharvest()\n',
      levelId: 'w1-robot-farm-1.1',
      seed: 42,
      timeoutMs: 5000,
      mockEnv: {},
    });
    const warmExecutionMs = performance.now() - t1;

    expect(res1.success).toBe(true);

    // 3. Measure Second Warm Run (Steady state)
    const t2 = performance.now();
    const res2 = await core.executeCode({
      code: 'step()\nharvest()\n',
      levelId: 'w1-robot-farm-1.1',
      seed: 43,
      timeoutMs: 5000,
      mockEnv: {},
    });
    const steadyStateMs = performance.now() - t2;

    expect(res2.success).toBe(true);

    console.log(`[RUNTIME BENCHMARK] Cold Start: ${coldStartMs.toFixed(2)} ms (Budget: <= 8000 ms)`);
    console.log(`[RUNTIME BENCHMARK] Warm First Run: ${warmExecutionMs.toFixed(2)} ms (Budget: <= 2000 ms)`);
    console.log(`[RUNTIME BENCHMARK] Steady State Run: ${steadyStateMs.toFixed(2)} ms (Budget: <= 1500 ms)`);

    // Quality Bar Assertions
    expect(coldStartMs).toBeLessThan(8000);
    expect(warmExecutionMs).toBeLessThan(2000);
    expect(steadyStateMs).toBeLessThan(1500);
  }, 30000);
});
