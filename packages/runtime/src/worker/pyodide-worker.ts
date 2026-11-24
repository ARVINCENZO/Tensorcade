/**
 * Web Worker Entry Point for Sandboxed Python Runtime.
 *
 * Conforms to docs/11-lld.md §3:
 * Exposes PyodideWorkerApi across the Web Worker boundary via Comlink RPC.
 */

import * as Comlink from 'comlink';
import { PyodideWorkerCore } from './pyodide-worker-core.js';

const workerCore = new PyodideWorkerCore();

// Expose the API to the main thread via Comlink
Comlink.expose(workerCore);
