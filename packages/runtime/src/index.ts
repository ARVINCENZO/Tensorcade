/**
 * @tensorcade/runtime - Sandboxed Python Runtime.
 *
 * Conforms to docs/11-lld.md §3, docs/14-sandbox-and-threat-model.md §3, and ADR-017 / D-029:
 * - Pyodide 314.0.8 in dedicated Web Worker.
 * - Comlink typed RPC interface.
 * - 2-tier timeout defense (SharedArrayBuffer soft interrupt + hard watchdog worker termination).
 * - Pedagogical diagnostic feedback & AST constraint inspection.
 * - Per-world lazy package loading.
 * - Service worker asset caching.
 */

export * from './types.js';
export { PythonRuntimeClient } from './client/python-runtime-client.js';
export { PyodideWorkerCore } from './worker/pyodide-worker-core.js';
export { DiagnosticErrorMapper } from './diagnostics/error-mapper.js';
export { AstInspector } from './diagnostics/ast-inspector.js';
export { WorldPackageRegistry, WORLD_PACKAGES } from './packages/world-package-registry.js';
export { ServiceWorkerManager, PYODIDE_CACHE_NAME } from './caching/service-worker-manager.js';
