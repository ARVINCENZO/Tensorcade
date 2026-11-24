/**
 * Grid-World Domain Types for Robot Farm Simulation.
 *
 * Conforms to docs/CURRICULUM_MAP.md §2 (World 1) and docs/13-engine-spec.md:
 * - Discrete 2D grid coordinates.
 * - Integer energy and tick pacing.
 * - Deterministic collision detection and crop harvesting rules.
 */

export type Direction = 0 | 1 | 2 | 3;

export const Direction = {
  NORTH: 0,
  EAST: 1,
  SOUTH: 2,
  WEST: 3,
} as const;

export const DIRECTION_VECTORS: Record<Direction, readonly [dx: number, dy: number]> = {
  [Direction.NORTH]: [0, -1],
  [Direction.EAST]: [1, 0],
  [Direction.SOUTH]: [0, 1],
  [Direction.WEST]: [-1, 0],
};

export type CellType = 0 | 1 | 2 | 3 | 4;

export const CellType = {
  EMPTY: 0,
  CROP: 1,
  ROCK: 2,
  RAVINE: 3,
  BASE: 4,
} as const;

export interface Position {
  readonly x: number;
  readonly y: number;
}

export interface RoverState {
  x: number;
  y: number;
  heading: Direction;
  energy: number;
  inventory: number;
}

export interface GridWorldConfig {
  readonly levelId: string;
  readonly maxTicks: number;
  readonly seed: number;
  readonly width: number;
  readonly height: number;
  readonly initialRover: {
    readonly x: number;
    readonly y: number;
    readonly heading: Direction;
    readonly energy: number;
  };
  readonly crops: ReadonlyArray<Position>;
  readonly rocks?: ReadonlyArray<Position>;
  readonly ravines?: ReadonlyArray<Position>;
  readonly star2TickThreshold?: number;
}

export type RobotActionType = 'MOVE_FORWARD' | 'TURN_LEFT' | 'TURN_RIGHT' | 'HARVEST' | 'WAIT';

export interface RobotActionParams {
  readonly type?: RobotActionType;
}

export interface GridWorldState {
  readonly width: number;
  readonly height: number;
  rover: RoverState;
  grid: number[][]; // [y][x] -> CellType
  totalCropsInitial: number;
  cropsHarvested: number;
  crashed: boolean;
  crashReason?: string | undefined;
}
