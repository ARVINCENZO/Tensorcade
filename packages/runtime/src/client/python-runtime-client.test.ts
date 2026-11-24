import { describe, it, expect, vi } from 'vitest';
import { PythonRuntimeClient } from './python-runtime-client.js';
import type { PyodideWorkerApi, CodeExecutionResponse } from '@tensorcade/contracts';

describe('PythonRuntimeClient', () => {
  it('instantiates with default options and uninitialized state', () => {
    const client = new PythonRuntimeClient();
    expect(client.getState()).toBe('UNINITIALIZED');
    expect(client.getBootInfo()).toBeNull();
  });

  it('manages worker initialization and boot metadata using mock worker factory', async () => {
    const mockWorkerApi: PyodideWorkerApi = {
      initRuntime: vi.fn().mockResolvedValue({
        pythonVersion: '3.14.0',
        pyodideVersion: '314.0.8',
        memoryLimitMb: 2048,
      }),
      loadPackageWheel: vi.fn().mockResolvedValue(true),
      loadPackages: vi.fn().mockResolvedValue(true),
      executeCode: vi.fn().mockResolvedValue({
        success: true,
        executionTimeMs: 15,
        stdout: 'Hello',
        stderr: '',
      } satisfies CodeExecutionResponse),
      inspectAst: vi.fn().mockResolvedValue({ valid: true, violations: [] }),
      setInterruptBuffer: vi.fn(),
    };

    // Construct mock worker with message channel
    const mockWorker = {
      terminate: vi.fn(),
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Worker;

    const client = new PythonRuntimeClient({
      workerFactory: () => mockWorker,
    });

    // Directly assign mock API for testing client orchestration
    (client as unknown as { api: PyodideWorkerApi; state: string }).api = mockWorkerApi;
    (client as unknown as { state: string }).state = 'READY';

    const response = await client.executeCode({
      code: 'print("Hello")',
      levelId: 'w1-robot-farm-1.1',
      seed: 42,
      timeoutMs: 1000,
      mockEnv: {},
    });

    expect(response.success).toBe(true);
    expect(response.stdout).toBe('Hello');
  });

  it('terminates cleanly when terminate() is invoked', () => {
    const mockWorker = {
      terminate: vi.fn(),
    } as unknown as Worker;

    const client = new PythonRuntimeClient({
      workerFactory: () => mockWorker,
    });

    (client as unknown as { worker: Worker; state: string }).worker = mockWorker;
    client.terminate();

    expect(mockWorker.terminate).toHaveBeenCalled();
    expect(client.getState()).toBe('TERMINATED');
  });

  it('re-initializes worker runtime and reloads packages after watchdog hard termination', async () => {
    const mockWorkerApi1: PyodideWorkerApi = {
      initRuntime: vi.fn().mockResolvedValue({
        pythonVersion: '3.14.0',
        pyodideVersion: '314.0.8',
        memoryLimitMb: 2048,
      }),
      loadPackageWheel: vi.fn().mockResolvedValue(true),
      loadPackages: vi.fn().mockResolvedValue(true),
      executeCode: vi.fn().mockImplementation(() => new Promise(() => {})), // Never resolves (stalls)
      inspectAst: vi.fn().mockResolvedValue({ valid: true, violations: [] }),
      setInterruptBuffer: vi.fn(),
    };

    const mockWorkerApi2: PyodideWorkerApi = {
      initRuntime: vi.fn().mockResolvedValue({
        pythonVersion: '3.14.0',
        pyodideVersion: '314.0.8',
        memoryLimitMb: 2048,
      }),
      loadPackageWheel: vi.fn().mockResolvedValue(true),
      loadPackages: vi.fn().mockResolvedValue(true),
      executeCode: vi.fn().mockResolvedValue({
        success: true,
        executionTimeMs: 10,
        stdout: 'recovered',
        stderr: '',
      } satisfies CodeExecutionResponse),
      inspectAst: vi.fn().mockResolvedValue({ valid: true, violations: [] }),
      setInterruptBuffer: vi.fn(),
    };

    const mockWorker = {
      terminate: vi.fn(),
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Worker;

    const client = new PythonRuntimeClient({
      workerFactory: () => mockWorker,
      timeoutMs: 50,
      watchdogMarginMs: 50,
    });

    let activeApi = mockWorkerApi1;
    (client as unknown as { spawnWorker: () => void }).spawnWorker = () => {
      (client as unknown as { worker: Worker }).worker = mockWorker;
      (client as unknown as { api: PyodideWorkerApi }).api = activeApi;
    };

    // First, initialize and load world packages
    await client.init({ baseUrl: '/custom/pyodide/' });
    await client.loadWorldPackages('w2-data-detective');
    expect(mockWorkerApi1.loadPackages).toHaveBeenCalledWith(expect.arrayContaining(['pandas']));

    // Trigger execution that stalls and forces watchdog hard timeout (50 + 50 = 100ms)
    const timeoutRes = await client.executeCode({
      code: 'while True: pass',
      levelId: 'w2-data-detective-2.1',
      seed: 42,
      timeoutMs: 50,
      mockEnv: {},
    });
    expect(timeoutRes.success).toBe(false);
    expect(timeoutRes.stderr).toContain('Execution terminated by watchdog');

    // Switch active API to simulate fresh respawned worker
    activeApi = mockWorkerApi2;
    (client as unknown as { api: PyodideWorkerApi }).api = mockWorkerApi2;

    // Subsequent execution MUST re-init and reload packages
    const recoveryRes = await client.executeCode({
      code: 'print("recovered")',
      levelId: 'w2-data-detective-2.1',
      seed: 42,
      timeoutMs: 500,
      mockEnv: {},
    });

    expect(recoveryRes.success).toBe(true);
    expect(recoveryRes.stdout).toBe('recovered');
    expect(mockWorkerApi2.initRuntime).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: '/custom/pyodide/' }),
    );
    expect(mockWorkerApi2.loadPackages).toHaveBeenCalledWith(expect.arrayContaining(['pandas']));
  });
});
