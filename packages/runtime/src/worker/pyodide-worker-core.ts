/**
 * Core Pyodide Execution Engine.
 *
 * Conforms to docs/11-lld.md §3, docs/14-sandbox-and-threat-model.md §3, and ADR-017:
 * - Bootstraps CPython WASM via loadPyodide.
 * - Redirects stdout/stderr with output caps (65,536 chars).
 * - Intercepts matplotlib figures and encodes to base64 PNG data URLs.
 * - Injects game actions bridge ('tensorcade' discrete actions).
 * - Traps exceptions and maps to 4-part pedagogical feedback.
 * - Operates in both browser Web Worker and Node.js environments.
 */

import { loadPyodide, type PyodideInterface } from 'pyodide';
import {
  type PyodideWorkerApi,
  type RuntimeInitConfig,
  type RuntimeBootInfo,
  type CodeExecutionRequest,
  type CodeExecutionResponse,
  type AstConstraints,
  type AstInspectionResult,
  type ActionTrace,
  type DiscreteActionData,
  CodeExecutionRequestSchema,
} from '@tensorcade/contracts';
import { DiagnosticErrorMapper } from '../diagnostics/error-mapper.js';
import { AstInspector } from '../diagnostics/ast-inspector.js';
import { PYODIDE_VERSION } from '../types.js';

const DEFAULT_MAX_OUTPUT_LENGTH = 65536;

export class PyodideWorkerCore implements PyodideWorkerApi {
  private pyodide: PyodideInterface | null = null;
  private interruptBuffer: SharedArrayBuffer | null = null;
  private initialized = false;
  private memoryLimitMb = 2048;

  public async initRuntime(config: RuntimeInitConfig): Promise<RuntimeBootInfo> {
    this.memoryLimitMb = config.memoryLimitMb ?? 2048;

    let indexURL = config.baseUrl;
    if (!indexURL && typeof process !== 'undefined' && process.versions?.node) {
      try {
        const { createRequire } = await import('node:module');
        const path = await import('node:path');
        const require = createRequire(import.meta.url);
        indexURL = path.dirname(require.resolve('pyodide'));
      } catch {
        // Fallback
      }
    }

    const options: Parameters<typeof loadPyodide>[0] = {};
    if (indexURL) {
      options.indexURL = indexURL;
    }

    this.pyodide = await loadPyodide(options);

    // Register interrupt buffer if already configured
    if (this.interruptBuffer) {
      this.pyodide.setInterruptBuffer(new Int32Array(this.interruptBuffer));
    }

    // Preload requested packages
    if (config.preloadPackages && config.preloadPackages.length > 0) {
      await this.loadPackages(config.preloadPackages);
    }

    this.initialized = true;

    // Query CPython version
    const pythonVersion = this.pyodide.runPython(
      'import platform; platform.python_version()'
    ) as string;

    return {
      pythonVersion,
      pyodideVersion: PYODIDE_VERSION,
      memoryLimitMb: this.memoryLimitMb,
    };
  }

  public setInterruptBuffer(buffer: SharedArrayBuffer): void {
    this.interruptBuffer = buffer;
    if (this.pyodide) {
      this.pyodide.setInterruptBuffer(new Int32Array(buffer));
    }
  }

  public async loadPackageWheel(packageName: string): Promise<boolean> {
    return this.loadPackages([packageName]);
  }

  public async loadPackages(packages: ReadonlyArray<string>): Promise<boolean> {
    if (!this.pyodide) {
      throw new Error('Pyodide runtime must be initialized before loading packages.');
    }
    if (packages.length === 0) return true;

    try {
      await this.pyodide.loadPackage(packages as string[]);
      return true;
    } catch {
      return false;
    }
  }

  public async inspectAst(code: string, constraints: AstConstraints): Promise<AstInspectionResult> {
    return AstInspector.inspect(code, constraints);
  }

  public async executeCode<TAction = unknown>(
    rawRequest: CodeExecutionRequest
  ): Promise<CodeExecutionResponse<TAction>> {
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // 1. Validate request payload boundary
    const request = CodeExecutionRequestSchema.parse(rawRequest);

    if (!this.pyodide) {
      // Lazy auto-init if not yet explicitly booted
      await this.initRuntime({ baseUrl: '', memoryLimitMb: 2048, preloadPackages: [] });
    }

    const pyodide = this.pyodide;
    if (!pyodide) {
      throw new Error('Failed to obtain Pyodide instance.');
    }

    const maxOutputLength = request.options?.maxOutputLength ?? DEFAULT_MAX_OUTPUT_LENGTH;

    // Reset interrupt buffer flag before execution
    if (this.interruptBuffer) {
      Atomics.store(new Int32Array(this.interruptBuffer), 0, 0);
    }

    // 2. Set up Python execution harness
    try {
      const maxActions = 2000;

      // Expose execution parameters to Python namespace
      pyodide.globals.set('__user_code_raw', request.code);
      pyodide.globals.set('__max_output_length', maxOutputLength);
      pyodide.globals.set('__max_actions', maxActions);
      pyodide.globals.set('__mock_env', request.mockEnv ?? {});

      const harnessScript = `
import sys, io, base64

class _BoundedStringIO(io.StringIO):
    def __init__(self, max_length=65536):
        super().__init__()
        self.max_length = int(max_length)
        self.truncated = False

    def write(self, s):
        if self.truncated:
            return len(s)
        curr_len = self.tell()
        if curr_len + len(s) > self.max_length:
            allowed = max(0, self.max_length - curr_len)
            if allowed > 0:
                super().write(s[:allowed])
            super().write("\\n... [Output truncated: maximum size limit reached]")
            self.truncated = True
            return len(s)
        return super().write(s)

__stdout_buffer = _BoundedStringIO(max_length=__max_output_length)
__stderr_buffer = _BoundedStringIO(max_length=__max_output_length)
__orig_stdout = sys.stdout
__orig_stderr = sys.stderr
sys.stdout = __stdout_buffer
sys.stderr = __stderr_buffer

# Game action recorder
class _TensorcadeBridge:
    def __init__(self, max_actions=2000):
        self.tick = 1
        self.actions = []
        self.max_actions = int(max_actions)

    def record_action(self, action_type, **params):
        if len(self.actions) >= self.max_actions:
            raise RuntimeError(f"Maximum action limit exceeded ({self.max_actions} actions). Execution halted.")
        self.actions.append({
            "tick": int(self.tick),
            "type": str(action_type),
            "params": params
        })
        self.tick += 1

__bridge = _TensorcadeBridge(max_actions=__max_actions)

# Built-in game action helpers
def step(): __bridge.record_action("MOVE_FORWARD")
def move_forward(): __bridge.record_action("MOVE_FORWARD")
def turn_left(): __bridge.record_action("TURN_LEFT")
def turn_right(): __bridge.record_action("TURN_RIGHT")
def harvest(): __bridge.record_action("HARVEST")
def wait(): __bridge.record_action("WAIT")

__user_globals = {
    "__name__": "__main__",
    "step": step,
    "move_forward": move_forward,
    "turn_left": turn_left,
    "turn_right": turn_right,
    "harvest": harvest,
    "wait": wait,
}

# Inject mockEnv variables
if isinstance(__mock_env, dict):
    __user_globals.update(__mock_env)

__execution_error = None
try:
    __compiled = compile(__user_code_raw, "<learner_code>", "exec")
    exec(__compiled, __user_globals)
except BaseException as e:
    __execution_error = e
finally:
    sys.stdout = __orig_stdout
    sys.stderr = __orig_stderr

__captured_stdout = __stdout_buffer.getvalue()
__captured_stderr = __stderr_buffer.getvalue()

# Extract Matplotlib figures if matplotlib was used (capped at 5 figures to prevent memory exhaustion)
__figures = []
if "matplotlib.pyplot" in sys.modules:
    try:
        plt = sys.modules["matplotlib.pyplot"]
        for fignum in list(plt.get_fignums())[:5]:
            fig = plt.figure(fignum)
            img_buf = io.BytesIO()
            fig.savefig(img_buf, format="png", bbox_inches="tight")
            img_buf.seek(0)
            img_b64 = base64.b64encode(img_buf.read()).decode("ascii")
            __figures.append(f"data:image/png;base64,{img_b64}")
        if hasattr(plt, "close"):
            plt.close("all")
    except Exception:
        pass

__recorded_actions = __bridge.actions
`;

      await pyodide.runPythonAsync(harnessScript);

      const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const executionTimeMs = Math.max(0, endTime - startTime);

      let stdout = (pyodide.globals.get('__captured_stdout') as string) || '';
      let stderr = (pyodide.globals.get('__captured_stderr') as string) || '';
      const isBufferTruncated = Boolean(
        pyodide.runPython('bool(__stdout_buffer.truncated or __stderr_buffer.truncated)')
      );
      let outputTruncated = isBufferTruncated;

      if (stdout.length > maxOutputLength) {
        stdout = stdout.slice(0, maxOutputLength) + '\n... [Output truncated: maximum size limit reached]';
        outputTruncated = true;
      }
      if (stderr.length > maxOutputLength) {
        stderr = stderr.slice(0, maxOutputLength) + '\n... [Stderr truncated: maximum size limit reached]';
        outputTruncated = true;
      }

      // Check for caught Python exception
      const pyError = pyodide.globals.get('__execution_error');
      if (pyError) {
        const errorString = pyodide.runPython(
          'import traceback; "".join(traceback.format_exception(__execution_error))'
        ) as string;

        const diagnosticError = DiagnosticErrorMapper.mapError(errorString, request.code);

        return {
          success: false,
          executionTimeMs,
          stdout,
          stderr,
          outputTruncated: outputTruncated ? true : undefined,
          diagnosticError,
        };
      }

      // Extract Matplotlib figures
      const figuresPy = pyodide.globals.get('__figures');
      const figures: string[] = figuresPy ? (figuresPy.toJs() as string[]) : [];

      // Extract recorded actions
      const actionsPy = pyodide.globals.get('__recorded_actions');
      const rawActions: Array<{ tick: number; type: string; params?: Record<string, number | string | boolean | null> }> =
        actionsPy ? (actionsPy.toJs() as Array<{ tick: number; type: string; params?: Record<string, number | string | boolean | null> }>) : [];

      let actionTrace: ActionTrace<TAction> | undefined;
      if (rawActions.length > 0) {
        const actions: DiscreteActionData[] = rawActions.map((a) => ({
          tick: a.tick,
          type: a.type,
          params: a.params ?? {},
        }));

        actionTrace = {
          version: '1.0.0',
          levelId: request.levelId,
          mode: 'hacker',
          seed: request.seed,
          totalTicks: actions.length,
          actions,
          clientTerminalHash: '0000000000000000', // Replayer will compute authoritative terminal hash
        } as ActionTrace<TAction>;
      }

      return {
        success: true,
        executionTimeMs,
        stdout,
        stderr,
        outputTruncated: outputTruncated ? true : undefined,
        figures: figures.length > 0 ? figures : undefined,
        actionTrace,
      };
    } catch (err: unknown) {
      const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const executionTimeMs = Math.max(0, endTime - startTime);
      const rawError = err instanceof Error ? err : new Error(String(err));
      const diagnosticError = DiagnosticErrorMapper.mapError(rawError, request.code);

      return {
        success: false,
        executionTimeMs,
        stdout: '',
        stderr: rawError.message,
        diagnosticError,
      };
    }
  }

  public getMemoryUsageMb(): number {
    if (!this.pyodide) return 0;
    try {
      const heapBytes = (this.pyodide as unknown as { _module?: { HEAPU8?: Uint8Array } })._module?.HEAPU8?.byteLength ?? 0;
      return Math.round((heapBytes / (1024 * 1024)) * 100) / 100;
    } catch {
      return 0;
    }
  }

  public isInitialized(): boolean {
    return this.initialized;
  }
}
