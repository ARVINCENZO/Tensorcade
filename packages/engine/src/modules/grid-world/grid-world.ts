/**
 * Robot Farm Grid-World Simulation Module.
 *
 * Conforms to docs/CURRICULUM_MAP.md §2 (World 1: Robot Farm):
 * - Discrete 2D procedural agricultural grid.
 * - Directional motion, sensor obstacles, ravines, and crop harvesting.
 * - Little-Endian binary packing for xxHash64 verification.
 */

import { BaseSimulationEngine } from '../../core-loop.js';
import type { DiscreteAction, SimulationOutcome } from '../../types.js';
import {
  CellType,
  Direction,
  DIRECTION_VECTORS,
  type GridWorldConfig,
  type GridWorldState,
  type RobotActionParams,
} from './types.js';

export class RobotFarmSimulation extends BaseSimulationEngine<GridWorldState, RobotActionParams> {
  public readonly gridWidth: number;
  public readonly gridHeight: number;
  public readonly star2TickThreshold: number;
  private readonly config: GridWorldConfig;
  private packBuf: Uint8Array | undefined;
  private packView: DataView | undefined;

  constructor(config: GridWorldConfig) {
    super(
      {
        levelId: config.levelId,
        maxTicks: config.maxTicks,
        seed: config.seed,
      },
      RobotFarmSimulation.createInitialState(config),
    );
    this.config = config;
    this.gridWidth = config.width;
    this.gridHeight = config.height;
    this.star2TickThreshold = config.star2TickThreshold ?? 25;
  }

  public static createInitialState(config: GridWorldConfig): GridWorldState {
    const grid: number[][] = [];
    for (let y = 0; y < config.height; y++) {
      grid.push(new Array<number>(config.width).fill(CellType.EMPTY));
    }

    // Place crops
    for (const crop of config.crops) {
      const row = grid[crop.y];
      if (row && crop.x >= 0 && crop.x < config.width) {
        row[crop.x] = CellType.CROP;
      }
    }

    // Place rocks
    if (config.rocks) {
      for (const rock of config.rocks) {
        const row = grid[rock.y];
        if (row && rock.x >= 0 && rock.x < config.width) {
          row[rock.x] = CellType.ROCK;
        }
      }
    }

    // Place ravines
    if (config.ravines) {
      for (const ravine of config.ravines) {
        const row = grid[ravine.y];
        if (row && ravine.x >= 0 && ravine.x < config.width) {
          row[ravine.x] = CellType.RAVINE;
        }
      }
    }

    // Place recharge bases
    if (config.bases) {
      for (const base of config.bases) {
        const row = grid[base.y];
        if (row && base.x >= 0 && base.x < config.width) {
          row[base.x] = CellType.BASE;
        }
      }
    }

    const maxEnergy = config.initialRover.maxEnergy ?? config.initialRover.energy;

    return {
      width: config.width,
      height: config.height,
      rover: {
        x: config.initialRover.x,
        y: config.initialRover.y,
        heading: config.initialRover.heading,
        energy: config.initialRover.energy,
        maxEnergy,
        inventory: 0,
      },
      grid,
      totalCropsInitial: config.crops.length,
      cropsHarvested: 0,
      crashed: false,
      crashReason: undefined,
    };
  }

  protected initWorldState(_seed: number): GridWorldState {
    return RobotFarmSimulation.createInitialState(this.config);
  }

  protected advanceTick(actions: ReadonlyArray<DiscreteAction<RobotActionParams>>): void {
    if (this.state.crashed) {
      return;
    }

    if (actions.length > 1) {
      this.state.crashed = true;
      this.state.crashReason = 'MULTIPLE_ACTIONS_PER_TICK';
      return;
    }

    // Process primary action for this tick (or default WAIT)
    const primaryAction = actions[0];
    const actionType =
      primaryAction?.params?.type ?? (primaryAction?.type as RobotActionParams['type']) ?? 'WAIT';

    switch (actionType) {
      case 'MOVE_FORWARD': {
        const [dx, dy] = DIRECTION_VECTORS[this.state.rover.heading];
        const nx = this.state.rover.x + dx;
        const ny = this.state.rover.y + dy;

        // Boundary check
        if (nx < 0 || nx >= this.state.width || ny < 0 || ny >= this.state.height) {
          this.state.crashed = true;
          this.state.crashReason = 'OUT_OF_BOUNDS_COLLISION';
          break;
        }

        const cell = this.state.grid[ny]?.[nx];
        if (cell === CellType.RAVINE) {
          this.state.crashed = true;
          this.state.crashReason = 'CRASHED_INTO_RAVINE';
          break;
        }
        if (cell === CellType.ROCK) {
          this.state.crashed = true;
          this.state.crashReason = 'COLLIDED_WITH_ROCK';
          break;
        }

        this.state.rover.x = nx;
        this.state.rover.y = ny;
        this.state.rover.energy -= 1;
        break;
      }

      case 'TURN_LEFT': {
        this.state.rover.heading = ((this.state.rover.heading + 3) % 4) as Direction;
        this.state.rover.energy -= 1;
        break;
      }

      case 'TURN_RIGHT': {
        this.state.rover.heading = ((this.state.rover.heading + 1) % 4) as Direction;
        this.state.rover.energy -= 1;
        break;
      }

      case 'HARVEST': {
        const rx = this.state.rover.x;
        const ry = this.state.rover.y;
        if (this.state.grid[ry]?.[rx] === CellType.CROP) {
          this.state.grid[ry][rx] = CellType.EMPTY;
          this.state.rover.inventory += 1;
          this.state.cropsHarvested += 1;
        }
        this.state.rover.energy -= 1;
        break;
      }

      case 'RECHARGE': {
        const rx = this.state.rover.x;
        const ry = this.state.rover.y;
        if (this.state.grid[ry]?.[rx] === CellType.BASE) {
          this.state.rover.energy =
            this.state.rover.maxEnergy ??
            this.config.initialRover.maxEnergy ??
            this.config.initialRover.energy;
        } else {
          this.state.rover.energy -= 1;
        }
        break;
      }

      case 'WAIT':
      default:
        // No movement, energy preserved
        break;
    }

    // Energy depletion check
    if (
      this.state.rover.energy <= 0 &&
      this.state.cropsHarvested < this.state.totalCropsInitial &&
      !this.state.crashed
    ) {
      this.state.crashed = true;
      this.state.crashReason = 'ENERGY_DEPLETED';
    }
  }

  protected packBinaryState(): Uint8Array {
    const totalCells = this.state.width * this.state.height;
    const requiredLen = 28 + totalCells;
    if (!this.packBuf || !this.packView || this.packBuf.length !== requiredLen) {
      this.packBuf = new Uint8Array(requiredLen);
      this.packView = new DataView(this.packBuf.buffer);
    }
    const buf = this.packBuf;
    const view = this.packView;

    view.setInt32(0, this.state.rover.x, true);
    view.setInt32(4, this.state.rover.y, true);
    view.setInt32(8, this.state.rover.heading, true);
    view.setInt32(12, this.state.rover.energy, true);
    view.setInt32(16, this.state.rover.inventory, true);
    view.setInt32(20, this.state.cropsHarvested, true);
    view.setInt32(24, this.state.crashed ? 1 : 0, true);

    let offset = 28;
    for (let y = 0; y < this.state.height; y++) {
      const row = this.state.grid[y];
      if (row) {
        for (let x = 0; x < this.state.width; x++) {
          buf[offset++] = row[x] ?? 0;
        }
      }
    }

    return buf;
  }

  protected cloneState(state: GridWorldState): GridWorldState {
    return {
      width: state.width,
      height: state.height,
      rover: { ...state.rover },
      grid: state.grid.map((row) => [...row]),
      totalCropsInitial: state.totalCropsInitial,
      cropsHarvested: state.cropsHarvested,
      crashed: state.crashed,
      crashReason: state.crashReason,
    };
  }

  protected evaluateOutcome(): SimulationOutcome {
    if (this.state.crashed) {
      return {
        status: 'LOST',
        terminalTick: this.currentTick,
        terminalHash: this.getStateHashHex(),
        starsAwarded: 0,
        metrics: {
          cropsHarvested: this.state.cropsHarvested,
          energyRemaining: Math.max(this.state.rover.energy, 0),
        },
        message: this.state.crashReason ?? 'Rover crashed',
      };
    }

    if (
      this.state.totalCropsInitial > 0 &&
      this.state.cropsHarvested >= this.state.totalCropsInitial
    ) {
      let stars: 1 | 2 | 3 = 1;
      if (this.currentTick <= this.star2TickThreshold) {
        stars = 2;
      }
      if (this.currentTick <= this.star2TickThreshold && this.state.rover.energy >= 5) {
        stars = 3;
      }

      return {
        status: 'WON',
        terminalTick: this.currentTick,
        terminalHash: this.getStateHashHex(),
        starsAwarded: stars,
        metrics: {
          cropsHarvested: this.state.cropsHarvested,
          energyRemaining: this.state.rover.energy,
          ticks: this.currentTick,
        },
        message: 'All agricultural crops harvested successfully!',
      };
    }

    return {
      status: 'RUNNING',
      terminalTick: 0,
      terminalHash: this.getStateHashHex(),
      starsAwarded: 0,
      metrics: {
        cropsHarvested: this.state.cropsHarvested,
        energyRemaining: this.state.rover.energy,
      },
    };
  }

  public getGridWorldState(): Readonly<GridWorldState> {
    return this.state;
  }

  public isFrontClear(): boolean {
    const [dx, dy] = DIRECTION_VECTORS[this.state.rover.heading];
    const nx = this.state.rover.x + dx;
    const ny = this.state.rover.y + dy;
    if (nx < 0 || nx >= this.state.width || ny < 0 || ny >= this.state.height) {
      return false;
    }
    const cell = this.state.grid[ny]?.[nx];
    return cell !== CellType.ROCK && cell !== CellType.RAVINE;
  }

  public isRockAhead(): boolean {
    const [dx, dy] = DIRECTION_VECTORS[this.state.rover.heading];
    const nx = this.state.rover.x + dx;
    const ny = this.state.rover.y + dy;
    if (nx < 0 || nx >= this.state.width || ny < 0 || ny >= this.state.height) {
      return false;
    }
    return this.state.grid[ny]?.[nx] === CellType.ROCK;
  }

  public isRavineAhead(): boolean {
    const [dx, dy] = DIRECTION_VECTORS[this.state.rover.heading];
    const nx = this.state.rover.x + dx;
    const ny = this.state.rover.y + dy;
    if (nx < 0 || nx >= this.state.width || ny < 0 || ny >= this.state.height) {
      return true;
    }
    return this.state.grid[ny]?.[nx] === CellType.RAVINE;
  }

  public canHarvest(): boolean {
    return this.state.grid[this.state.rover.y]?.[this.state.rover.x] === CellType.CROP;
  }

  public isOnBase(): boolean {
    return this.state.grid[this.state.rover.y]?.[this.state.rover.x] === CellType.BASE;
  }

  public hasEnergy(): boolean {
    return this.state.rover.energy > 0;
  }

  public isFieldCleared(): boolean {
    return (
      this.state.totalCropsInitial > 0 && this.state.cropsHarvested >= this.state.totalCropsInitial
    );
  }
}
