/**
 * Types & Interfaces for @tensorcade/runtime.
 *
 * Conforms to docs/11-lld.md §3, docs/14-sandbox-and-threat-model.md §3, and ADR-017 / D-029.
 */

import type {
  CodeExecutionRequest,
  CodeExecutionResponse,
  DiagnosticError,
  AstConstraints,
  AstInspectionResult,
  RuntimeInitConfig,
  RuntimeBootInfo,
  PyodideWorkerApi,
  ActionTrace,
} from '@tensorcade/contracts';

export type {
  CodeExecutionRequest,
  CodeExecutionResponse,
  DiagnosticError,
  AstConstraints,
  AstInspectionResult,
  RuntimeInitConfig,
  RuntimeBootInfo,
  PyodideWorkerApi,
  ActionTrace,
};

/**
 * Pinned Pyodide version specification (ADR-017, D-024, D-029).
 */
export const PYODIDE_VERSION = '314.0.8';

/**
 * Progress notification callback when downloading or initializing Python wheels.
 */
export type ProgressCallback = (stage: string, percent: number) => void;

/**
 * Configuration options for the PythonRuntimeClient on the main UI thread.
 */
export interface PythonRuntimeClientOptions {
  /**
   * Base URL where Pyodide wasm and standard library assets are served.
   * Defaults to '/pyodide/' or CDN URL.
   */
  readonly baseUrl?: string | undefined;

  /**
   * Execution timeout in milliseconds before triggering soft interrupt (default: 5000 ms).
   */
  readonly timeoutMs?: number | undefined;

  /**
   * Hard watchdog timeout margin in milliseconds before terminating the worker (default: 500 ms).
   * Total hard timeout = timeoutMs + watchdogMarginMs (default: 5500 ms).
   */
  readonly watchdogMarginMs?: number | undefined;

  /**
   * Custom worker factory function (used in testing or custom bundle environments).
   */
  readonly workerFactory?: (() => Worker) | undefined;
}

/**
 * Internal state of the Python runtime client.
 */
export type RuntimeState = 'UNINITIALIZED' | 'INITIALIZING' | 'READY' | 'EXECUTING' | 'TERMINATED';
