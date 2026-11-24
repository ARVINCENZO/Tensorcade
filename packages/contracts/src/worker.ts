import { z } from 'zod';
import { ActionTraceSchema, type ActionTrace } from './entities.js';

/**
 * Execution limits and environment options.
 */
export const ExecutionOptionsSchema = z.object({
  timeoutMs: z.number().int().positive().default(5000),
  memoryLimitMb: z.number().int().positive().optional(),
  maxOutputLength: z.number().int().positive().optional(),
});
export type ExecutionOptions = z.infer<typeof ExecutionOptionsSchema>;

/**
 * 4-part pedagogical diagnostic feedback structure for Python runtime failures.
 */
export const DiagnosticErrorSchema = z.object({
  errorType: z.string().min(1),
  whatHappened: z.string().min(1),
  whereItOccurred: z.object({
    line: z.number().int(),
    column: z.number().int(),
    sourceSnippet: z.string(),
  }),
  whyItMatters: z.string().min(1),
  whatToInvestigate: z.string().min(1),
  rawTraceback: z.string().optional(),
});
export type DiagnosticError = z.infer<typeof DiagnosticErrorSchema>;

/**
 * Request payload dispatched to the Web Worker for sandboxed execution.
 */
export const CodeExecutionRequestSchema = z.object({
  code: z.string(),
  levelId: z.string().min(1),
  seed: z.number().int(),
  timeoutMs: z.number().int().positive().default(5000),
  mockEnv: z.record(z.string(), z.unknown()).default({}),
  options: ExecutionOptionsSchema.optional(),
});
export type CodeExecutionRequest = z.infer<typeof CodeExecutionRequestSchema>;

/**
 * Sandboxed code execution response returned from the Web Worker.
 */
export const CodeExecutionResponseSchema = z.object({
  success: z.boolean(),
  executionTimeMs: z.number().nonnegative(),
  actionTrace: ActionTraceSchema.optional(),
  stdout: z.string(),
  stderr: z.string(),
  outputTruncated: z.boolean().optional(),
  figures: z.array(z.string()).optional(),
  diagnosticError: DiagnosticErrorSchema.optional(),
});
export interface CodeExecutionResponse<TAction = unknown> {
  readonly success: boolean;
  readonly executionTimeMs: number;
  readonly actionTrace?: ActionTrace<TAction> | undefined;
  readonly stdout: string;
  readonly stderr: string;
  readonly outputTruncated?: boolean | undefined;
  readonly figures?: ReadonlyArray<string> | undefined;
  readonly diagnosticError?: DiagnosticError | undefined;
}

/**
 * Runtime boot configuration for Pyodide worker initialization.
 */
export const RuntimeInitConfigSchema = z.object({
  baseUrl: z.string().min(1),
  memoryLimitMb: z.number().int().positive().default(2048),
  preloadPackages: z.array(z.string()).default([]),
});
export type RuntimeInitConfig = z.infer<typeof RuntimeInitConfigSchema>;

/**
 * Environment metadata returned after Pyodide successfully boots.
 */
export const RuntimeBootInfoSchema = z.object({
  pythonVersion: z.string(),
  pyodideVersion: z.string(),
  memoryLimitMb: z.number().int().positive(),
});
export type RuntimeBootInfo = z.infer<typeof RuntimeBootInfoSchema>;

/**
 * AST syntactic and static constraints.
 */
export const AstConstraintsSchema = z.object({
  bannedTokens: z.array(z.string()).optional(),
  requiredFunctions: z.array(z.string()).optional(),
  bannedImports: z.array(z.string()).optional(),
  requiredConstructs: z.array(z.string()).optional(),
  maxActionCalls: z.record(z.string(), z.number().int().nonnegative()).optional(),
  minFunctionParams: z.number().int().positive().optional(),
});
export type AstConstraints = z.infer<typeof AstConstraintsSchema>;

/**
 * Individual AST violation detected by static analysis.
 */
export const AstViolationSchema = z.object({
  rule: z.string(),
  line: z.number().int(),
  message: z.string(),
});
export type AstViolation = z.infer<typeof AstViolationSchema>;

/**
 * Static AST inspection result.
 */
export const AstInspectionResultSchema = z.object({
  valid: z.boolean(),
  violations: z.array(AstViolationSchema),
});
export type AstInspectionResult = z.infer<typeof AstInspectionResultSchema>;

/**
 * Comlink RPC interface exposed by the Pyodide Web Worker.
 */
export interface PyodideWorkerApi {
  /**
   * Boots the Pyodide runtime and caches the CPython wasm module.
   */
  initRuntime(config: RuntimeInitConfig): Promise<RuntimeBootInfo>;

  /**
   * Dynamically loads a Python package wheel (e.g., numpy, scipy, scikit-learn).
   */
  loadPackageWheel(packageName: string): Promise<boolean>;

  /**
   * Dynamically loads a batch of Python packages for a specific game world.
   */
  loadPackages(packages: ReadonlyArray<string>): Promise<boolean>;

  /**
   * Executes learner Python code within a sandboxed environment.
   */
  executeCode<TAction = unknown>(
    request: CodeExecutionRequest,
  ): Promise<CodeExecutionResponse<TAction>>;

  /**
   * Validates code against static AST constraints (banned syntax, required constructs).
   */
  inspectAst(code: string, constraints: AstConstraints): Promise<AstInspectionResult>;

  /**
   * Configures the SharedArrayBuffer interrupt buffer for instant timeout cancellation.
   */
  setInterruptBuffer(buffer: SharedArrayBuffer): void;
}
