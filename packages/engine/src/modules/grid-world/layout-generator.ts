/**
 * Deterministic Procedural Grid-World Layout Generator for Robot Farm.
 *
 * Pure TypeScript, zero DOM/Node/I/O, Mulberry32 PRNG only, zero transcendental math.
 * Produces identical concrete GridWorldConfig instances for any (levelId, environmentConfig, seed)
 * across browser LevelPlayer, Node LevelValidator, and server trace re-simulation.
 */

import { DeterministicPRNG } from '../../prng.js';
import {
  Direction,
  DIRECTION_VECTORS,
  type GridWorldConfig,
  type GridWorldGeneratorType,
  type Position,
} from './types.js';

interface RawRoverConfig {
  x?: number;
  y?: number;
  heading?: string | number;
  energy?: number;
  maxEnergy?: number;
}

function parseDirection(heading: string | number | undefined): Direction {
  if (heading === 0 || heading === 'NORTH') return Direction.NORTH;
  if (heading === 1 || heading === 'EAST') return Direction.EAST;
  if (heading === 2 || heading === 'SOUTH') return Direction.SOUTH;
  if (heading === 3 || heading === 'WEST') return Direction.WEST;
  return Direction.EAST;
}

function parsePositionList(raw: unknown): Position[] {
  if (!Array.isArray(raw)) return [];
  const result: Position[] = [];
  for (const item of raw) {
    if (
      typeof item === 'object' &&
      item !== null &&
      typeof (item as { x?: unknown }).x === 'number' &&
      typeof (item as { y?: unknown }).y === 'number'
    ) {
      result.push({
        x: Math.trunc((item as { x: number }).x),
        y: Math.trunc((item as { y: number }).y),
      });
    }
  }
  return result;
}

function inBounds(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && x < width && y >= 0 && y < height;
}

function posKey(x: number, y: number): string {
  return `${x},${y}`;
}

function dedupePositions(positions: ReadonlyArray<Position>): Position[] {
  const seen = new Set<string>();
  const out: Position[] = [];
  for (const p of positions) {
    const key = posKey(p.x, p.y);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

function buildStaticConfig(
  levelId: string,
  env: Record<string, unknown>,
  seed: number,
  defaultMaxTicks: number,
  defaultStar2Threshold: number,
): GridWorldConfig {
  const rawRover = (env['initialRover'] as RawRoverConfig | undefined) ?? {};
  const width = typeof env['width'] === 'number' ? env['width'] : 4;
  const height = typeof env['height'] === 'number' ? env['height'] : 4;
  const maxTicks = typeof env['maxTicks'] === 'number' ? env['maxTicks'] : defaultMaxTicks;
  const crops = parsePositionList(env['crops']);
  const rocks = parsePositionList(env['rocks']);
  const ravines = parsePositionList(env['ravines']);
  const bases = parsePositionList(env['bases']);
  const star2TickThreshold =
    typeof env['star2TickThreshold'] === 'number'
      ? env['star2TickThreshold']
      : defaultStar2Threshold;

  const initialEnergy = typeof rawRover.energy === 'number' ? rawRover.energy : 100;
  const maxEnergy = typeof rawRover.maxEnergy === 'number' ? rawRover.maxEnergy : initialEnergy;

  return {
    levelId,
    maxTicks,
    seed,
    width,
    height,
    initialRover: {
      x: typeof rawRover.x === 'number' ? rawRover.x : 0,
      y: typeof rawRover.y === 'number' ? rawRover.y : 0,
      heading: parseDirection(rawRover.heading),
      energy: initialEnergy,
      maxEnergy,
    },
    crops: crops.length > 0 ? crops : [{ x: 1, y: 0 }],
    ...(rocks.length > 0 ? { rocks } : {}),
    ...(ravines.length > 0 ? { ravines } : {}),
    ...(bases.length > 0 ? { bases } : {}),
    star2TickThreshold,
  };
}

/**
 * Level 1.1: First Furrow — 5 distinct starting coordinates and headings.
 * Seed 10001 preserves (0, 0) EAST -> crop (1, 0) for baseline preview and tests.
 */
function generateFirstFurrow(
  levelId: string,
  seed: number,
  maxTicks: number,
  star2TickThreshold: number,
): GridWorldConfig {
  const width = 4;
  const height = 4;

  if (seed === 10001) {
    return {
      levelId,
      maxTicks,
      seed,
      width,
      height,
      initialRover: { x: 0, y: 0, heading: Direction.EAST, energy: 100, maxEnergy: 100 },
      crops: [{ x: 1, y: 0 }],
      ravines: [
        { x: 2, y: 0 },
        { x: 0, y: 1 },
      ],
      star2TickThreshold,
    };
  }

  const prng = new DeterministicPRNG(seed);
  const heading = prng.nextInt(0, 3) as Direction;
  const [dx, dy] = DIRECTION_VECTORS[heading];
  const rightHeading = ((heading + 1) % 4) as Direction;
  const [rdx, rdy] = DIRECTION_VECTORS[rightHeading];

  const minX = dx < 0 ? 1 : 0;
  const maxX = dx > 0 ? width - 2 : width - 1;
  const minY = dy < 0 ? 1 : 0;
  const maxY = dy > 0 ? height - 2 : height - 1;

  const sx = prng.nextInt(minX, maxX);
  const sy = prng.nextInt(minY, maxY);
  const crop: Position = { x: sx + dx, y: sy + dy };

  const ravines: Position[] = [];
  const overshootX = sx + dx * 2;
  const overshootY = sy + dy * 2;
  if (inBounds(overshootX, overshootY, width, height)) {
    ravines.push({ x: overshootX, y: overshootY });
  }
  const flankX = sx + rdx;
  const flankY = sy + rdy;
  if (inBounds(flankX, flankY, width, height)) {
    ravines.push({ x: flankX, y: flankY });
  }

  return {
    levelId,
    maxTicks,
    seed,
    width,
    height,
    initialRover: { x: sx, y: sy, heading, energy: 100, maxEnergy: 100 },
    crops: [crop],
    ...(ravines.length > 0 ? { ravines: dedupePositions(ravines) } : {}),
    star2TickThreshold,
  };
}

/**
 * Level 1.2: Turning Corners — Rotated/shifted L-shaped corridor (2 steps -> turn right -> 2 steps -> harvest).
 */
function generateCornerCorridor(
  levelId: string,
  seed: number,
  maxTicks: number,
  star2TickThreshold: number,
): GridWorldConfig {
  const width = 6;
  const height = 6;
  const prng = new DeterministicPRNG(seed);
  const heading = prng.nextInt(0, 3) as Direction;
  const rightHeading = ((heading + 1) % 4) as Direction;
  const [dx1, dy1] = DIRECTION_VECTORS[heading];
  const [dx2, dy2] = DIRECTION_VECTORS[rightHeading];

  const minDx = Math.min(0, 2 * dx1, 2 * dx1 + 2 * dx2);
  const maxDx = Math.max(0, 2 * dx1, 2 * dx1 + 2 * dx2);
  const minDy = Math.min(0, 2 * dy1, 2 * dy1 + 2 * dy2);
  const maxDy = Math.max(0, 2 * dy1, 2 * dy1 + 2 * dy2);

  const sx = prng.nextInt(-minDx, width - 1 - maxDx);
  const sy = prng.nextInt(-minDy, height - 1 - maxDy);

  const path: Position[] = [
    { x: sx, y: sy },
    { x: sx + dx1, y: sy + dy1 },
    { x: sx + 2 * dx1, y: sy + 2 * dy1 },
    { x: sx + 2 * dx1 + dx2, y: sy + 2 * dy1 + dy2 },
    { x: sx + 2 * dx1 + 2 * dx2, y: sy + 2 * dy1 + 2 * dy2 },
  ];
  const pathKeys = new Set(path.map((p) => posKey(p.x, p.y)));
  const corner = path[2]!;
  const target = path[4]!;

  // Place ravines on overshoot, wrong turn at corner, and beside first step
  const candidates: Position[] = [
    { x: corner.x + dx1, y: corner.y + dy1 },
    { x: corner.x - dx2, y: corner.y - dy2 },
    { x: sx + dx2, y: sy + dy2 },
    { x: target.x + dx2, y: target.y + dy2 },
  ];
  const ravines = dedupePositions(
    candidates.filter((p) => inBounds(p.x, p.y, width, height) && !pathKeys.has(posKey(p.x, p.y))),
  );

  return {
    levelId,
    maxTicks,
    seed,
    width,
    height,
    initialRover: { x: sx, y: sy, heading, energy: 40, maxEnergy: 40 },
    crops: [target],
    ...(ravines.length > 0 ? { ravines } : {}),
    star2TickThreshold,
  };
}

/**
 * Level 1.3: The Row Harvest — Variable-length straight furrow (4..11 tiles) terminated by ravine.
 */
function generateVariableRow(
  levelId: string,
  seed: number,
  maxTicks: number,
  star2TickThreshold: number,
): GridWorldConfig {
  const width = 14;
  const height = 3;
  const prng = new DeterministicPRNG(seed);
  const rowLength = prng.nextInt(4, 11);

  const crops: Position[] = [];
  for (let x = 1; x <= rowLength; x++) {
    crops.push({ x, y: 1 });
  }

  const rocks: Position[] = [];
  for (let x = 0; x < width; x++) {
    rocks.push({ x, y: 0 }, { x, y: 2 });
  }

  return {
    levelId,
    maxTicks,
    seed,
    width,
    height,
    initialRover: { x: 0, y: 1, heading: Direction.EAST, energy: 40, maxEnergy: 40 },
    crops,
    rocks,
    ravines: [{ x: rowLength + 1, y: 1 }],
    star2TickThreshold,
    metadata: { rowLength },
  };
}

/**
 * Level 1.4: Skip-Row Telemetry — Crops on every 2nd tile with tight energy budget preventing blind harvest.
 */
function generateSkipRow(
  levelId: string,
  seed: number,
  maxTicks: number,
  star2TickThreshold: number,
): GridWorldConfig {
  const width = 16;
  const height = 3;
  const prng = new DeterministicPRNG(seed);
  const pairs = prng.nextInt(3, 7);
  const rowLength = pairs * 2;

  const crops: Position[] = [];
  for (let x = 2; x <= rowLength; x += 2) {
    crops.push({ x, y: 1 });
  }

  const rocks: Position[] = [];
  for (let x = 0; x < width; x++) {
    rocks.push({ x, y: 0 }, { x, y: 2 });
  }

  // Optimal solution costs 3 * pairs energy; blind step+harvest costs 4 * pairs (> 3 * pairs + 2 for pairs >= 3)
  const energy = pairs * 3 + 2;

  return {
    levelId,
    maxTicks,
    seed,
    width,
    height,
    initialRover: { x: 0, y: 1, heading: Direction.EAST, energy, maxEnergy: energy },
    crops,
    rocks,
    ravines: [{ x: rowLength + 1, y: 1 }],
    star2TickThreshold,
    metadata: { rowLength },
  };
}

/**
 * Level 1.5: Selective Harvest — Sparse seeded crops along a variable-length row with tight energy.
 */
function generateSelectiveRow(
  levelId: string,
  seed: number,
  maxTicks: number,
  star2TickThreshold: number,
): GridWorldConfig {
  const width = 14;
  const height = 3;
  const prng = new DeterministicPRNG(seed);
  const rowLength = prng.nextInt(6, 11);

  const positions: number[] = [];
  for (let x = 1; x <= rowLength; x++) {
    positions.push(x);
  }
  prng.shuffle(positions);

  const maxCrops = Math.max(2, Math.floor(rowLength / 2));
  const cropCount = prng.nextInt(2, Math.min(maxCrops, rowLength - 3));
  const selectedXs = positions.slice(0, cropCount).sort((a, b) => a - b);
  const crops: Position[] = selectedXs.map((x) => ({ x, y: 1 }));

  const rocks: Position[] = [];
  for (let x = 0; x < width; x++) {
    rocks.push({ x, y: 0 }, { x, y: 2 });
  }

  // Optimal uses rowLength + cropCount; blind step+harvest uses 2 * rowLength (>= energy + 1)
  const energy = rowLength + cropCount + 2;

  return {
    levelId,
    maxTicks,
    seed,
    width,
    height,
    initialRover: { x: 0, y: 1, heading: Direction.EAST, energy, maxEnergy: energy },
    crops,
    rocks,
    ravines: [{ x: rowLength + 1, y: 1 }],
    star2TickThreshold,
    metadata: { rowLength },
  };
}

/**
 * Level 1.6: Rock Corridor — Clockwise 3-segment corridor blocked by rocks at variable bend lengths.
 */
function generateRockCorridor(
  levelId: string,
  seed: number,
  maxTicks: number,
  star2TickThreshold: number,
): GridWorldConfig {
  const width = 10;
  const height = 10;
  const prng = new DeterministicPRNG(seed);

  const len1 = prng.nextInt(3, 6);
  const len2 = prng.nextInt(2, 5);
  const len3 = prng.nextInt(2, Math.min(5, len1));

  const pathTiles: Position[] = [];
  // Segment 1: EAST from (1, 1) to (1 + len1, 1)
  for (let i = 1; i <= len1; i++) {
    pathTiles.push({ x: 1 + i, y: 1 });
  }
  // Segment 2: SOUTH from (1 + len1, 1) to (1 + len1, 1 + len2)
  for (let i = 1; i <= len2; i++) {
    pathTiles.push({ x: 1 + len1, y: 1 + i });
  }
  // Segment 3: WEST from (1 + len1, 1 + len2) to (1 + len1 - len3, 1 + len2)
  for (let i = 1; i <= len3; i++) {
    pathTiles.push({ x: 1 + len1 - i, y: 1 + len2 });
  }

  const rocks: Position[] = [
    { x: 1 + len1 + 1, y: 1 },
    { x: 1 + len1, y: 1 + len2 + 1 },
    { x: 1 + len1 - len3 - 1, y: 1 + len2 },
  ];

  // Select 4 deterministic crop tiles along the path (always including the final tile)
  const candidates = pathTiles.slice(0, pathTiles.length - 1);
  prng.shuffle(candidates);
  const chosenCrops = [...candidates.slice(0, 3), pathTiles[pathTiles.length - 1]!];

  const rowLength = len1 + 1 + len2 + 1 + len3;

  return {
    levelId,
    maxTicks,
    seed,
    width,
    height,
    initialRover: { x: 1, y: 1, heading: Direction.EAST, energy: 45, maxEnergy: 45 },
    crops: dedupePositions(chosenCrops),
    rocks: dedupePositions(rocks),
    star2TickThreshold,
    metadata: { rowLength },
  };
}

/**
 * Level 1.7: Hazard Triage — Corridor containing both ROCK (turn right) and RAVINE (turn left) junctions.
 */
function generateHazardTriage(
  levelId: string,
  seed: number,
  maxTicks: number,
  star2TickThreshold: number,
): GridWorldConfig {
  const width = 11;
  const height = 11;
  const prng = new DeterministicPRNG(seed);

  const l1 = prng.nextInt(2, 3);
  const l2 = prng.nextInt(2, 3);
  const l3 = prng.nextInt(2, 3);
  const firstIsRock = prng.nextBoolean();

  const sx = 2;
  const sy = 5;
  const pathTiles: Position[] = [];
  const rocks: Position[] = [];
  const ravines: Position[] = [];

  // Segment 1: EAST
  for (let i = 1; i <= l1; i++) {
    pathTiles.push({ x: sx + i, y: sy });
  }
  const x1 = sx + l1;
  const y1 = sy;

  // Junction 1 hazard directly ahead at (x1 + 1, y1)
  if (firstIsRock) {
    rocks.push({ x: x1 + 1, y: y1 });
    // Guard wrong turn (NORTH) with a ravine so turning left crashes on next step
    ravines.push({ x: x1, y: y1 - 1 });
  } else {
    ravines.push({ x: x1 + 1, y: y1 });
    // Guard wrong turn (SOUTH) with a rock so turning right crashes on next step
    rocks.push({ x: x1, y: y1 + 1 });
  }

  // Segment 2: SOUTH (if rock) or NORTH (if ravine)
  const dy2 = firstIsRock ? 1 : -1;
  for (let i = 1; i <= l2; i++) {
    pathTiles.push({ x: x1, y: y1 + i * dy2 });
  }
  const x2 = x1;
  const y2 = y1 + l2 * dy2;

  // Junction 2 is always the opposite hazard so every seed tests BOTH rock and ravine triage
  const secondIsRock = !firstIsRock;
  if (secondIsRock) {
    // Heading NORTH -> ROCK ahead at (x2, y2 - 1) -> turn right -> EAST
    rocks.push({ x: x2, y: y2 + dy2 });
    ravines.push({ x: x2 - 1, y: y2 });
  } else {
    // Heading SOUTH -> RAVINE ahead at (x2, y2 + 1) -> turn left -> EAST
    ravines.push({ x: x2, y: y2 + dy2 });
    rocks.push({ x: x2 - 1, y: y2 });
  }

  // Segment 3: EAST
  for (let i = 1; i <= l3; i++) {
    pathTiles.push({ x: x2 + i, y: y2 });
  }

  const crops: Position[] = [
    pathTiles[l1 - 1]!,
    pathTiles[l1 + l2 - 1]!,
    pathTiles[pathTiles.length - 1]!,
  ];

  const rowLength = l1 + 1 + l2 + 1 + l3;

  return {
    levelId,
    maxTicks,
    seed,
    width,
    height,
    initialRover: { x: sx, y: sy, heading: Direction.EAST, energy: 35, maxEnergy: 35 },
    crops: dedupePositions(crops),
    rocks: dedupePositions(rocks),
    ravines: dedupePositions(ravines),
    star2TickThreshold,
    metadata: { rowLength },
  };
}

/**
 * Helper: builds a rock-walled rectangular dome and returns inner perimeter tiles in CW order.
 */
function buildFencedPerimeter(
  innerW: number,
  innerH: number,
): { width: number; height: number; rocks: Position[]; perimeter: Position[] } {
  const width = innerW + 2;
  const height = innerH + 2;
  const rocks: Position[] = [];

  for (let x = 0; x < width; x++) {
    rocks.push({ x, y: 0 }, { x, y: height - 1 });
  }
  for (let y = 1; y < height - 1; y++) {
    rocks.push({ x: 0, y }, { x: width - 1, y });
  }

  const perimeter: Position[] = [];
  // Top edge (1,1) excluded as rover start: (2,1) .. (innerW, 1)
  for (let x = 2; x <= innerW; x++) perimeter.push({ x, y: 1 });
  // Right edge: (innerW, 2) .. (innerW, innerH)
  for (let y = 2; y <= innerH; y++) perimeter.push({ x: innerW, y });
  // Bottom edge: (innerW - 1, innerH) .. (1, innerH)
  for (let x = innerW - 1; x >= 1; x--) perimeter.push({ x, y: innerH });
  // Left edge: (1, innerH - 1) .. (1, 2)
  for (let y = innerH - 1; y >= 2; y--) perimeter.push({ x: 1, y });

  return { width, height, rocks, perimeter };
}

/**
 * Level 1.8: The Shifting Perimeter — Unknown rectangle perimeter requiring dynamic `while not is_field_cleared():`.
 */
function generateShiftingPerimeter(
  levelId: string,
  seed: number,
  maxTicks: number,
  star2TickThreshold: number,
): GridWorldConfig {
  const prng = new DeterministicPRNG(seed);
  const innerW = prng.nextInt(3, 6);
  const innerH = prng.nextInt(3, 5);
  const { width, height, rocks, perimeter } = buildFencedPerimeter(innerW, innerH);

  // Place guaranteed crop near end of west edge + seeded crops around all 4 edges
  const crops: Position[] = [
    { x: Math.min(2, innerW), y: 1 },
    { x: innerW, y: Math.min(2, innerH) },
    { x: Math.max(1, innerW - 1), y: innerH },
    { x: 1, y: 2 },
  ];

  // Add 1-2 extra deterministic perimeter crops
  const extras = perimeter.filter((p) => !crops.some((c) => c.x === p.x && c.y === p.y));
  prng.shuffle(extras);
  for (const extra of extras.slice(0, 2)) {
    crops.push(extra);
  }

  return {
    levelId,
    maxTicks,
    seed,
    width,
    height,
    initialRover: { x: 1, y: 1, heading: Direction.EAST, energy: 60, maxEnergy: 60 },
    crops: dedupePositions(crops),
    rocks: dedupePositions(rocks),
    star2TickThreshold,
  };
}

/**
 * Level 1.9: Battery Relay — Fenced perimeter with low battery and BASE recharge pads at corners.
 */
function generateBatteryRelay(
  levelId: string,
  seed: number,
  maxTicks: number,
  star2TickThreshold: number,
): GridWorldConfig {
  const prng = new DeterministicPRNG(seed);
  const innerW = prng.nextInt(5, 6);
  const innerH = prng.nextInt(4, 5);
  const { width, height, rocks } = buildFencedPerimeter(innerW, innerH);

  const bases: Position[] = [
    { x: innerW, y: 1 }, // NE corner
    { x: innerW, y: innerH }, // SE corner
    { x: 1, y: innerH }, // SW corner
  ];
  const baseKeys = new Set(bases.map((b) => posKey(b.x, b.y)));

  // Place 2 crops per edge on non-base tiles so total action cost is ~26-30 (> starting energy 14)
  const crops: Position[] = [
    { x: 2, y: 1 },
    { x: innerW - 1, y: 1 },
    { x: innerW, y: 2 },
    { x: innerW, y: innerH - 1 },
    { x: innerW - 1, y: innerH },
    { x: 2, y: innerH },
    { x: 1, y: innerH - 1 },
    { x: 1, y: 2 },
  ].filter((p) => !baseKeys.has(posKey(p.x, p.y)));

  return {
    levelId,
    maxTicks,
    seed,
    width,
    height,
    initialRover: { x: 1, y: 1, heading: Direction.EAST, energy: 14, maxEnergy: 16 },
    crops: dedupePositions(crops),
    rocks: dedupePositions(rocks),
    bases,
    star2TickThreshold,
  };
}

/**
 * Levels 1.10 & 1.11: Multi-Plot / Modular Plots — 3 east-west furrows of seeded widths off west spine (x = 1).
 */
function generateMultiPlot(
  levelId: string,
  seed: number,
  maxTicks: number,
  star2TickThreshold: number,
  sparseCrops: boolean,
): GridWorldConfig {
  const width = 10;
  const height = 7;
  const prng = new DeterministicPRNG(seed);

  const plotLengths: number[] = [prng.nextInt(2, 6), prng.nextInt(2, 6), prng.nextInt(2, 6)];
  // Guarantee non-uniform widths across plots so hardcoding a single constant fails
  if (plotLengths[0] === plotLengths[1] && plotLengths[1] === plotLengths[2]) {
    plotLengths[2] = plotLengths[2]! >= 6 ? 3 : plotLengths[2]! + 1;
  }

  const crops: Position[] = [];
  const ravines: Position[] = [];
  const rocks: Position[] = [];

  for (let y = 0; y < height; y++) {
    rocks.push({ x: 0, y });
  }

  for (let i = 0; i < plotLengths.length; i++) {
    const length = plotLengths[i]!;
    const y = 1 + i * 2;
    for (let dx = 1; dx <= length; dx++) {
      if (!sparseCrops || dx === length || prng.nextBoolean(0.65)) {
        crops.push({ x: 1 + dx, y });
      }
    }
    ravines.push({ x: 2 + length, y });
  }

  return {
    levelId,
    maxTicks,
    seed,
    width,
    height,
    initialRover: { x: 1, y: 1, heading: Direction.EAST, energy: 100, maxEnergy: 100 },
    crops: dedupePositions(crops),
    rocks: dedupePositions(rocks),
    ravines: dedupePositions(ravines),
    star2TickThreshold,
    metadata: { plotLengths },
  };
}

/**
 * Level 1.12: Autonomous Dome Capstone — 4 seeded sparse-crop plots + ravines + recharge bases along spine.
 */
function generateCapstoneDome(
  levelId: string,
  seed: number,
  maxTicks: number,
  star2TickThreshold: number,
): GridWorldConfig {
  const width = 11;
  const height = 9;
  const prng = new DeterministicPRNG(seed);

  const plotLengths: number[] = [
    prng.nextInt(3, 7),
    prng.nextInt(3, 7),
    prng.nextInt(3, 7),
    prng.nextInt(3, 7),
  ];
  if (plotLengths.every((l) => l === plotLengths[0])) {
    plotLengths[3] = plotLengths[3]! >= 7 ? 4 : plotLengths[3]! + 1;
  }

  const crops: Position[] = [];
  const ravines: Position[] = [];
  const rocks: Position[] = [];
  const bases: Position[] = [
    { x: 1, y: 3 },
    { x: 1, y: 5 },
    { x: 1, y: 7 },
  ];

  for (let y = 0; y < height; y++) {
    rocks.push({ x: 0, y });
  }

  for (let i = 0; i < plotLengths.length; i++) {
    const length = plotLengths[i]!;
    const y = 1 + i * 2;
    let placedInRow = 0;
    for (let dx = 1; dx <= length; dx++) {
      const mustPlace = dx === length && placedInRow === 0;
      if (mustPlace || (placedInRow < 4 && prng.nextBoolean(0.6))) {
        crops.push({ x: 1 + dx, y });
        placedInRow++;
      }
    }
    ravines.push({ x: 2 + length, y });
  }

  return {
    levelId,
    maxTicks,
    seed,
    width,
    height,
    initialRover: { x: 1, y: 1, heading: Direction.EAST, energy: 32, maxEnergy: 36 },
    crops: dedupePositions(crops),
    rocks: dedupePositions(rocks),
    ravines: dedupePositions(ravines),
    bases,
    star2TickThreshold,
    metadata: { plotLengths },
  };
}

/**
 * Deterministically resolves a manifest's environmentConfig and seed into a concrete GridWorldConfig.
 * Shared by LevelPlayer, LevelValidator, and server trace verification.
 */
export function resolveGridWorldConfig(
  levelId: string,
  environmentConfig: Record<string, unknown>,
  seed: number,
  defaultMaxTicks = 100,
  defaultStar2Threshold = 25,
): GridWorldConfig {
  const generator =
    (environmentConfig['generator'] as GridWorldGeneratorType | undefined) ?? 'static';
  const maxTicks =
    typeof environmentConfig['maxTicks'] === 'number'
      ? environmentConfig['maxTicks']
      : defaultMaxTicks;
  const star2TickThreshold =
    typeof environmentConfig['star2TickThreshold'] === 'number'
      ? environmentConfig['star2TickThreshold']
      : defaultStar2Threshold;

  switch (generator) {
    case 'first_furrow':
      return generateFirstFurrow(levelId, seed, maxTicks, star2TickThreshold);
    case 'corner_corridor':
      return generateCornerCorridor(levelId, seed, maxTicks, star2TickThreshold);
    case 'variable_row':
      return generateVariableRow(levelId, seed, maxTicks, star2TickThreshold);
    case 'skip_row':
      return generateSkipRow(levelId, seed, maxTicks, star2TickThreshold);
    case 'selective_row':
      return generateSelectiveRow(levelId, seed, maxTicks, star2TickThreshold);
    case 'rock_corridor':
      return generateRockCorridor(levelId, seed, maxTicks, star2TickThreshold);
    case 'hazard_triage':
      return generateHazardTriage(levelId, seed, maxTicks, star2TickThreshold);
    case 'shifting_perimeter':
      return generateShiftingPerimeter(levelId, seed, maxTicks, star2TickThreshold);
    case 'battery_relay':
      return generateBatteryRelay(levelId, seed, maxTicks, star2TickThreshold);
    case 'multi_plot':
      return generateMultiPlot(levelId, seed, maxTicks, star2TickThreshold, false);
    case 'modular_plots':
      return generateMultiPlot(levelId, seed, maxTicks, star2TickThreshold, true);
    case 'capstone_dome':
      return generateCapstoneDome(levelId, seed, maxTicks, star2TickThreshold);
    case 'static':
    default:
      return buildStaticConfig(
        levelId,
        environmentConfig,
        seed,
        defaultMaxTicks,
        defaultStar2Threshold,
      );
  }
}
