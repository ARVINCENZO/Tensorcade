/**
 * Main-Thread Python Runtime Client.
 *
 * Conforms to docs/11-lld.md §3, docs/14-sandbox-and-threat-model.md §3, and ADR-017:
 * - Wraps dedicated Web Worker with Comlink typed RPC.
 * - Manages 4-byte SharedArrayBuffer interrupt buffer for sub-50ms soft interrupt.
 * - Implements 2-tier hard watchdog timer with auto-termination & respawn.
 * - Validates payloads across boundaries using Zod contracts.
 */

import * as Comlink from 'comlink';
import {
  type PyodideWorkerApi,
  type CodeExecutionRequest,
  type CodeExecutionResponse,
  type AstConstraints,
  type AstInspectionResult,
  type RuntimeInitConfig,
  type RuntimeBootInfo,
  CodeExecutionRequestSchema,
  CodeExecutionResponseSchema,
} from '@tensorcade/contracts';
import { WorldPackageRegistry } from '../packages/world-package-registry.js';
import { DiagnosticErrorMapper } from '../diagnostics/error-mapper.js';
import type { PythonRuntimeClientOptions, ProgressCallback, RuntimeState } from '../types.js';

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_WATCHDOG_MARGIN_MS = 500;

export class PythonRuntimeClient {
  private worker: Worker | null = null;
  private api: Comlink.Remote<PyodideWorkerApi> | null = null;
  private interruptBuffer: SharedArrayBuffer | null = null;
  private state: RuntimeState = 'UNINITIALIZED';
  private bootInfo: RuntimeBootInfo | null = null;
  private lastInitConfig: RuntimeInitConfig | null = null;
  private readonly loadedPackages: Set<string> = new Set();
  private readonly options: PythonRuntimeClientOptions;

  constructor(options: PythonRuntimeClientOptions = {}) {
    this.options = {
      baseUrl: options.baseUrl ?? '/pyodide/',
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      watchdogMarginMs: options.watchdogMarginMs ?? DEFAULT_WATCHDOG_MARGIN_MS,
      workerFactory: options.workerFactory,
    };
  }

  public async init(config?: Partial<RuntimeInitConfig>): Promise<RuntimeBootInfo> {
    if (this.state === 'READY' && this.bootInfo) {
      return this.bootInfo;
    }

    this.state = 'INITIALIZING';
    this.spawnWorker();

    const fullConfig: RuntimeInitConfig = {
      baseUrl: config?.baseUrl ?? this.options.baseUrl ?? '/pyodide/',
      memoryLimitMb: config?.memoryLimitMb ?? 2048,
      preloadPackages: config?.preloadPackages ? [...config.preloadPackages] : [],
    };
    this.lastInitConfig = fullConfig;
    if (fullConfig.preloadPackages) {
      for (const pkg of fullConfig.preloadPackages) {
        this.loadedPackages.add(pkg);
      }
    }

    if (!this.api) {
      throw new Error('Worker API failed to initialize.');
    }

    this.bootInfo = await this.api.initRuntime(fullConfig);
    this.state = 'READY';

    return this.bootInfo;
  }

  public async loadWorldPackages(
    worldOrGameId: string,
    onProgress?: ProgressCallback,
  ): Promise<boolean> {
    const packages = WorldPackageRegistry.getPackagesForWorld(worldOrGameId);
    if (packages.length === 0) {
      onProgress?.('Standard library ready', 100);
      return true;
    }

    if (!this.api) {
      await this.init();
    }

    onProgress?.(`Loading packages: ${packages.join(', ')}`, 10);
    const success = await this.api!.loadPackages(packages);
    if (success) {
      for (const pkg of packages) {
        this.loadedPackages.add(pkg);
      }
    }
    onProgress?.(success ? 'Packages ready' : 'Failed to load packages', 100);

    return success;
  }

  public async inspectAst(
    code: string,
    constraints?: AstConstraints,
  ): Promise<AstInspectionResult> {
    if (!this.api) {
      await this.init();
    }
    return this.api!.inspectAst(code, constraints ?? {});
  }

  public async executeCode<TAction = unknown>(
    rawRequest: CodeExecutionRequest,
  ): Promise<CodeExecutionResponse<TAction>> {
    // 1. Zod boundary validation on request
    const request = CodeExecutionRequestSchema.parse(rawRequest);

    if (this.state !== 'READY' || !this.api) {
      await this.init(this.lastInitConfig ?? undefined);
      if (this.loadedPackages.size > 0 && this.api) {
        await this.api.loadPackages(Array.from(this.loadedPackages));
      }
    }

    this.state = 'EXECUTING';

    const timeoutMs = request.options?.timeoutMs ?? this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const watchdogMarginMs = this.options.watchdogMarginMs ?? DEFAULT_WATCHDOG_MARGIN_MS;
    const totalHardTimeout = timeoutMs + watchdogMarginMs;

    let softTimer: ReturnType<typeof setTimeout> | null = null;
    let hardTimer: ReturnType<typeof setTimeout> | null = null;

    // Reset interrupt flag to 0
    if (this.interruptBuffer) {
      Atomics.store(new Int32Array(this.interruptBuffer), 0, 0);
    }

    const executionPromise = this.api!.executeCode(request);

    // Watchdog Layer 1: Soft Interrupt via SharedArrayBuffer
    softTimer = setTimeout(() => {
      if (this.interruptBuffer) {
        // Set SIGINT flag (2)
        Atomics.store(new Int32Array(this.interruptBuffer), 0, 2);
      }
    }, timeoutMs);

    // Watchdog Layer 2: Hard Worker Termination & Respawn Fallback
    const hardTimeoutPromise = new Promise<CodeExecutionResponse<TAction>>((resolve) => {
      hardTimer = setTimeout(() => {
        this.terminateAndRespawn();

        const diagnosticError = DiagnosticErrorMapper.mapError(
          `TimeoutError: Execution exceeded ${Math.round(totalHardTimeout / 100) / 10}s and was terminated by hard watchdog.`,
          request.code,
        );

        resolve({
          success: false,
          executionTimeMs: totalHardTimeout,
          stdout: '',
          stderr: `Execution terminated by watchdog after ${totalHardTimeout}ms.`,
          diagnosticError,
        });
      }, totalHardTimeout);
    });

    try {
      const response = await Promise.race([executionPromise, hardTimeoutPromise]);
      if (this.state === 'EXECUTING') {
        this.state = 'READY';
      }

      // 2. Zod boundary validation on response
      return CodeExecutionResponseSchema.parse(response) as CodeExecutionResponse<TAction>;
    } finally {
      if (softTimer) clearTimeout(softTimer);
      if (hardTimer) clearTimeout(hardTimer);
    }
  }

  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.api = null;
      this.state = 'TERMINATED';
    }
  }

  public getState(): RuntimeState {
    return this.state;
  }

  public getBootInfo(): RuntimeBootInfo | null {
    return this.bootInfo;
  }

  private spawnWorker(): void {
    if (this.worker) {
      this.worker.terminate();
    }

    if (this.options.workerFactory) {
      this.worker = this.options.workerFactory();
    } else if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../worker/pyodide-worker.js', import.meta.url), {
        type: 'module',
      });
    } else {
      throw new Error(
        'Web Worker is not supported in this environment without a custom workerFactory.',
      );
    }

    this.api = Comlink.wrap<PyodideWorkerApi>(this.worker);

    // Setup SharedArrayBuffer if supported by browser environment (COOP/COEP)
    if (typeof SharedArrayBuffer !== 'undefined') {
      this.interruptBuffer = new SharedArrayBuffer(4);
      void this.api.setInterruptBuffer(this.interruptBuffer);
    }
  }

  private terminateAndRespawn(): void {
    this.terminate();
    this.spawnWorker();
    this.state = 'UNINITIALIZED';
  }
}
