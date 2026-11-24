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
      'import platform; platform.python_version()',
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
    rawRequest: CodeExecutionRequest,
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

      // Expose execution parameters to Python namespace (JSON-serialized to ensure native Python dicts)
      pyodide.globals.set('__user_code_raw', request.code);
      pyodide.globals.set('__max_output_length', maxOutputLength);
      pyodide.globals.set('__max_actions', maxActions);
      pyodide.globals.set('__mock_env_json', JSON.stringify(request.mockEnv ?? {}));

      const harnessScript = `
import sys, io, base64, json

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

__mock_env = json.loads(__mock_env_json) if __mock_env_json else {}

class _RoverHalted(BaseException):
    """Internal control-flow signal when the simulated rover reaches a terminal crash state."""
    pass

class _RobotFarmMirror:
    """Exact pure-Python state mirror of RobotFarmSimulation for live sensor queries."""
    EMPTY = 0
    CROP = 1
    ROCK = 2
    RAVINE = 3
    BASE = 4
    DIR_VECTORS = ((0, -1), (1, 0), (0, 1), (-1, 0))
    HEADING_NAMES = ("NORTH", "EAST", "SOUTH", "WEST")
    HEADING_PARSE = {"NORTH": 0, "EAST": 1, "SOUTH": 2, "WEST": 3}

    def __init__(self, cfg):
        self.width = int(cfg.get("width", 4))
        self.height = int(cfg.get("height", 4))
        self.grid = [[self.EMPTY for _ in range(self.width)] for _ in range(self.height)]

        crops = cfg.get("crops") or []
        for c in crops:
            x, y = int(c["x"]), int(c["y"])
            if 0 <= x < self.width and 0 <= y < self.height:
                self.grid[y][x] = self.CROP
        for r in (cfg.get("rocks") or []):
            x, y = int(r["x"]), int(r["y"])
            if 0 <= x < self.width and 0 <= y < self.height:
                self.grid[y][x] = self.ROCK
        for rv in (cfg.get("ravines") or []):
            x, y = int(rv["x"]), int(rv["y"])
            if 0 <= x < self.width and 0 <= y < self.height:
                self.grid[y][x] = self.RAVINE
        for b in (cfg.get("bases") or []):
            x, y = int(b["x"]), int(b["y"])
            if 0 <= x < self.width and 0 <= y < self.height:
                self.grid[y][x] = self.BASE

        rover = cfg.get("initialRover") or {}
        raw_heading = rover.get("heading", 1)
        if isinstance(raw_heading, str):
            heading = self.HEADING_PARSE.get(raw_heading.upper(), 1)
        else:
            heading = int(raw_heading) % 4

        self.x = int(rover.get("x", 0))
        self.y = int(rover.get("y", 0))
        self.heading = heading
        self.energy = int(rover.get("energy", 100))
        self.max_energy = int(rover.get("maxEnergy", self.energy))
        self.inventory = 0
        self.total_crops = len(crops)
        self.crops_harvested = 0
        self.crashed = False

        meta = cfg.get("metadata") or {}
        self.row_length = int(meta["rowLength"]) if meta.get("rowLength") is not None else self.width
        self.plot_lengths = [int(v) for v in (meta.get("plotLengths") or [])]

    def _front_pos(self):
        dx, dy = self.DIR_VECTORS[self.heading]
        return self.x + dx, self.y + dy

    def apply_action(self, action_type):
        if self.crashed:
            return
        if action_type == "MOVE_FORWARD":
            nx, ny = self._front_pos()
            if nx < 0 or nx >= self.width or ny < 0 or ny >= self.height:
                self.crashed = True
            else:
                cell = self.grid[ny][nx]
                if cell == self.RAVINE or cell == self.ROCK:
                    self.crashed = True
                else:
                    self.x = nx
                    self.y = ny
                    self.energy -= 1
        elif action_type == "TURN_LEFT":
            self.heading = (self.heading + 3) % 4
            self.energy -= 1
        elif action_type == "TURN_RIGHT":
            self.heading = (self.heading + 1) % 4
            self.energy -= 1
        elif action_type == "HARVEST":
            if self.grid[self.y][self.x] == self.CROP:
                self.grid[self.y][self.x] = self.EMPTY
                self.inventory += 1
                self.crops_harvested += 1
            self.energy -= 1
        elif action_type == "RECHARGE":
            if self.grid[self.y][self.x] == self.BASE:
                self.energy = self.max_energy
            else:
                self.energy -= 1
        elif action_type == "WAIT":
            pass

        if self.energy <= 0 and self.crops_harvested < self.total_crops and not self.crashed:
            self.crashed = True

    def is_front_clear(self):
        nx, ny = self._front_pos()
        if nx < 0 or nx >= self.width or ny < 0 or ny >= self.height:
            return False
        cell = self.grid[ny][nx]
        return cell != self.ROCK and cell != self.RAVINE

    def is_rock_ahead(self):
        nx, ny = self._front_pos()
        if nx < 0 or nx >= self.width or ny < 0 or ny >= self.height:
            return False
        return self.grid[ny][nx] == self.ROCK

    def is_ravine_ahead(self):
        nx, ny = self._front_pos()
        if nx < 0 or nx >= self.width or ny < 0 or ny >= self.height:
            return True
        return self.grid[ny][nx] == self.RAVINE

    def can_harvest(self):
        return self.grid[self.y][self.x] == self.CROP

    def is_on_base(self):
        return self.grid[self.y][self.x] == self.BASE

    def has_energy(self):
        return (not self.crashed) and self.energy > 0

    def get_energy(self):
        return max(0, self.energy)

    def get_max_energy(self):
        return self.max_energy

    def crops_remaining(self):
        return max(0, self.total_crops - self.crops_harvested)

    def is_field_cleared(self):
        return self.total_crops > 0 and self.crops_harvested >= self.total_crops

    def get_position(self):
        return (self.x, self.y)

    def get_heading(self):
        return self.HEADING_NAMES[self.heading]

__grid_world_cfg = __mock_env.get("__gridWorld") if isinstance(__mock_env, dict) else None
__mirror = _RobotFarmMirror(__grid_world_cfg) if isinstance(__grid_world_cfg, dict) else None

# Game action recorder
class _TensorcadeBridge:
    def __init__(self, max_actions=2000, mirror=None):
        self.tick = 1
        self.actions = []
        self.max_actions = int(max_actions)
        self.mirror = mirror

    def record_action(self, action_type, **params):
        if len(self.actions) >= self.max_actions:
            raise RuntimeError(f"Maximum action limit exceeded ({self.max_actions} actions). Execution halted.")
        self.actions.append({
            "tick": int(self.tick),
            "type": str(action_type),
            "params": params
        })
        self.tick += 1
        if self.mirror is not None:
            self.mirror.apply_action(action_type)
            if self.mirror.crashed:
                raise _RoverHalted()

__bridge = _TensorcadeBridge(max_actions=__max_actions, mirror=__mirror)

# Built-in game action helpers
def step(): __bridge.record_action("MOVE_FORWARD")
def move_forward(): __bridge.record_action("MOVE_FORWARD")
def turn_left(): __bridge.record_action("TURN_LEFT")
def turn_right(): __bridge.record_action("TURN_RIGHT")
def harvest(): __bridge.record_action("HARVEST")
def wait(): __bridge.record_action("WAIT")
def recharge(): __bridge.record_action("RECHARGE")

# Live Robot Farm sensor & survey query helpers
def is_front_clear(): return __mirror.is_front_clear() if __mirror is not None else True
def is_rock_ahead(): return __mirror.is_rock_ahead() if __mirror is not None else False
def is_ravine_ahead(): return __mirror.is_ravine_ahead() if __mirror is not None else False
def can_harvest(): return __mirror.can_harvest() if __mirror is not None else False
def is_on_base(): return __mirror.is_on_base() if __mirror is not None else False
def has_energy(): return __mirror.has_energy() if __mirror is not None else True
def get_energy(): return __mirror.get_energy() if __mirror is not None else 100
def get_max_energy(): return __mirror.get_max_energy() if __mirror is not None else 100
def crops_remaining(): return __mirror.crops_remaining() if __mirror is not None else 0
def is_field_cleared(): return __mirror.is_field_cleared() if __mirror is not None else False
def get_position(): return __mirror.get_position() if __mirror is not None else (0, 0)
def get_heading(): return __mirror.get_heading() if __mirror is not None else "EAST"
def get_row_length(): return __mirror.row_length if __mirror is not None else int(__mock_env.get("width", 4))
def get_plot_lengths(): return list(__mirror.plot_lengths) if __mirror is not None else []

__user_globals = {
    "__name__": "__main__",
    "step": step,
    "move_forward": move_forward,
    "turn_left": turn_left,
    "turn_right": turn_right,
    "harvest": harvest,
    "wait": wait,
    "recharge": recharge,
    "is_front_clear": is_front_clear,
    "is_rock_ahead": is_rock_ahead,
    "is_ravine_ahead": is_ravine_ahead,
    "can_harvest": can_harvest,
    "is_on_base": is_on_base,
    "has_energy": has_energy,
    "get_energy": get_energy,
    "get_max_energy": get_max_energy,
    "crops_remaining": crops_remaining,
    "is_field_cleared": is_field_cleared,
    "get_position": get_position,
    "get_heading": get_heading,
    "get_row_length": get_row_length,
    "get_plot_lengths": get_plot_lengths,
}

# Inject public mockEnv variables (skip private internal keys like __gridWorld)
if isinstance(__mock_env, dict):
    for __k, __v in __mock_env.items():
        if not str(__k).startswith("__") and __k not in __user_globals:
            __user_globals[__k] = __v

__execution_error = None
try:
    __compiled = compile(__user_code_raw, "<learner_code>", "exec")
    exec(__compiled, __user_globals)
except _RoverHalted:
    # Simulation reached a terminal crash state; return recorded trace for engine replay diagnostics
    pass
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
        pyodide.runPython('bool(__stdout_buffer.truncated or __stderr_buffer.truncated)'),
      );
      let outputTruncated = isBufferTruncated;

      if (stdout.length > maxOutputLength) {
        stdout =
          stdout.slice(0, maxOutputLength) + '\n... [Output truncated: maximum size limit reached]';
        outputTruncated = true;
      }
      if (stderr.length > maxOutputLength) {
        stderr =
          stderr.slice(0, maxOutputLength) + '\n... [Stderr truncated: maximum size limit reached]';
        outputTruncated = true;
      }

      // Check for caught Python exception
      const pyError = pyodide.globals.get('__execution_error');
      if (pyError) {
        const errorString = pyodide.runPython(
          'import traceback; "".join(traceback.format_exception(__execution_error))',
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
      const rawActions: Array<{
        tick: number;
        type: string;
        params?: Record<string, number | string | boolean | null>;
      }> = actionsPy
        ? (actionsPy.toJs() as Array<{
            tick: number;
            type: string;
            params?: Record<string, number | string | boolean | null>;
          }>)
        : [];

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
      const heapBytes =
        (this.pyodide as unknown as { _module?: { HEAPU8?: Uint8Array } })._module?.HEAPU8
          ?.byteLength ?? 0;
      return Math.round((heapBytes / (1024 * 1024)) * 100) / 100;
    } catch {
      return 0;
    }
  }

  public isInitialized(): boolean {
    return this.initialized;
  }
}
