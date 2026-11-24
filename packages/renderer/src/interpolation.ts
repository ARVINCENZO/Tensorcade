/**
 * Grid-World State Interpolation Pacer.
 *
 * Conforms to docs/03-art-direction.md §5 and docs/13-engine-spec.md §2.1:
 * - Linear coordinate interpolation (lerp) for silky 60 Hz visual rendering.
 * - Shortest angular arc interpolation for directional heading rotation.
 * - Strict adherence to `prefers-reduced-motion` (instant discrete coordinate snap).
 */

import { Direction } from '@tensorcade/engine';
import type { GridWorldState } from '@tensorcade/engine';
import type { InterpolatedRoverState } from './types.js';

/**
 * Mapping from discrete Direction enum to angle in radians.
 * Standard orientation: North = 0, East = π/2, South = π, West = 3π/2.
 */
export const DIRECTION_TO_RADIAN: Record<number, number> = {
  [Direction.NORTH]: 0,
  [Direction.EAST]: Math.PI / 2,
  [Direction.SOUTH]: Math.PI,
  [Direction.WEST]: (3 * Math.PI) / 2,
};

/**
 * Computes shortest angular difference between two angles in radians.
 * Returns value in range [-π, π].
 */
export function shortestAngleDiff(target: number, source: number): number {
  const twoPi = 2 * Math.PI;
  return ((((target - source + Math.PI) % twoPi) + twoPi) % twoPi) - Math.PI;
}

/**
 * Interpolates rover state between two discrete simulation ticks.
 *
 * @param prev Previous tick state
 * @param curr Current tick state
 * @param alpha Visual interpolation factor in range [0.0, 1.0]
 * @param reducedMotion When true, disables tweening and snaps to current tick
 */
export function interpolateGridWorld(
  prev: Readonly<GridWorldState>,
  curr: Readonly<GridWorldState>,
  alpha: number,
  reducedMotion = false,
): InterpolatedRoverState {
  const clampedAlpha = Math.min(Math.max(alpha, 0.0), 1.0);

  if (reducedMotion || clampedAlpha >= 1.0) {
    const headingRad = DIRECTION_TO_RADIAN[curr.rover.heading] ?? 0;
    return {
      x: curr.rover.x,
      y: curr.rover.y,
      rotationRad: headingRad,
      energy: curr.rover.energy,
      inventory: curr.rover.inventory,
    };
  }

  if (clampedAlpha <= 0.0) {
    const headingRad = DIRECTION_TO_RADIAN[prev.rover.heading] ?? 0;
    return {
      x: prev.rover.x,
      y: prev.rover.y,
      rotationRad: headingRad,
      energy: prev.rover.energy,
      inventory: prev.rover.inventory,
    };
  }

  // Linear position interpolation
  const x = prev.rover.x + (curr.rover.x - prev.rover.x) * clampedAlpha;
  const y = prev.rover.y + (curr.rover.y - prev.rover.y) * clampedAlpha;

  // Angular rotation interpolation along shortest circular arc
  const prevRad = DIRECTION_TO_RADIAN[prev.rover.heading] ?? 0;
  const currRad = DIRECTION_TO_RADIAN[curr.rover.heading] ?? 0;
  const angleDelta = shortestAngleDiff(currRad, prevRad);
  const rotationRad = (prevRad + angleDelta * clampedAlpha + 2 * Math.PI) % (2 * Math.PI);

  // Energy & inventory retain current target tick values
  return {
    x,
    y,
    rotationRad,
    energy: curr.rover.energy,
    inventory: curr.rover.inventory,
  };
}
