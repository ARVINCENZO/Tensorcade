import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Direction, CellType } from '@tensorcade/engine';
import type { EngineSnapshot, GridWorldState } from '@tensorcade/engine';
import { ReplayViewer } from './ReplayViewer.js';

function createMockGridWorldState(
  roverX = 1,
  roverY = 1,
  heading: Direction = Direction.EAST,
): GridWorldState {
  const grid: number[][] = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => CellType.EMPTY as number),
  );
  grid[1]![1] = CellType.CROP;
  grid[2]![2] = CellType.ROCK;
  return {
    width: 4,
    height: 4,
    rover: {
      x: roverX,
      y: roverY,
      heading,
      energy: 95,
      inventory: 1,
    },
    grid,
    totalCropsInitial: 2,
    cropsHarvested: 1,
    crashed: false,
  };
}

function createSnapshot(state: GridWorldState, tick = 0): EngineSnapshot<GridWorldState> {
  return {
    tick,
    stateHash: 123456789n,
    stateHashHex: '00000000075bcd15',
    prngState: 42,
    state,
  };
}

describe('ReplayViewer', () => {
  it('renders complete HUD header, telemetry, controls, and accessibility mirror', () => {
    const s0 = createSnapshot(createMockGridWorldState(0, 0, Direction.NORTH), 0);
    const s1 = createSnapshot(createMockGridWorldState(1, 0, Direction.EAST), 1);
    const s2 = createSnapshot(createMockGridWorldState(2, 0, Direction.EAST), 2);

    const html = renderToStaticMarkup(
      <ReplayViewer
        snapshots={[s0, s1, s2]}
        config={{ width: 4, height: 4 }}
        levelTitle="Robot Farm 1.1 First Furrow"
      />,
    );

    // 1. HUD elements
    expect(html).toContain('Robot Farm 1.1 First Furrow');
    expect(html).toContain('Tick');
    expect(html).toContain('Energy:');
    expect(html).toContain('95%');
    expect(html).toContain('Crops:');
    expect(html).toContain('1/2');

    // 2. Control buttons
    expect(html).toContain('⏮');
    expect(html).toContain('◀');
    expect(html).toContain('▶ Play');
    expect(html).toContain('▶');
    expect(html).toContain('⏭');

    // 3. Speed toggles
    expect(html).toContain('0.5x');
    expect(html).toContain('1x');
    expect(html).toContain('2x');
    expect(html).toContain('4x');

    // 4. Scrubber slider
    expect(html).toContain('type="range"');
    expect(html).toContain('aria-label="Replay Scrubbing Timeline"');

    // 5. Accessible Screen-Reader DOM Mirror (WCAG 2.2 AA)
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Simulation Field Grid State');
    expect(html).toContain('<table');
  });

  it('renders crash indicator when state indicates crashed', () => {
    const crashedState = createMockGridWorldState(2, 2, Direction.SOUTH);
    crashedState.crashed = true;
    crashedState.crashReason = 'Rock collision';
    const s0 = createSnapshot(crashedState, 5);

    const html = renderToStaticMarkup(
      <ReplayViewer snapshots={[s0]} config={{ width: 4, height: 4 }} />,
    );

    expect(html).toContain('[CRASHED]');
    expect(html).toContain('Rock collision');
  });

  it('respects controlled tickIndex and speed props', () => {
    const s0 = createSnapshot(createMockGridWorldState(0, 0, Direction.NORTH), 0);
    const s1 = createSnapshot(createMockGridWorldState(1, 0, Direction.EAST), 1);
    const s2 = createSnapshot(createMockGridWorldState(2, 0, Direction.EAST), 2);

    const html = renderToStaticMarkup(
      <ReplayViewer
        snapshots={[s0, s1, s2]}
        config={{ width: 4, height: 4 }}
        tickIndex={2}
        speed={4}
      />,
    );

    expect(html).toContain(
      'Tick <strong class="text-[var(--tc-accent-amber,#F59E0B)]">2</strong> / 2',
    );
    expect(html).toContain('aria-pressed="true"');
  });
});
