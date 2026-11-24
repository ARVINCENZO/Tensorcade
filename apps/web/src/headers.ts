/**
 * Standard COOP and COEP isolation headers required for SharedArrayBuffer and Pyodide Web Workers.
 * Conforms to ADR-013, ADR-017, and docs/14-sandbox-and-threat-model.md.
 */
export const coopCoepHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
} as const;
