import type { Meta, StoryObj } from '@storybook/react';
import { Direction, CellType } from '@tensorcade/engine';
import type { EngineSnapshot, GridWorldState } from '@tensorcade/engine';
import { ReplayViewer } from './ReplayViewer.js';

function createLevelSnapshots(): EngineSnapshot<GridWorldState>[] {
  const snapshots: EngineSnapshot<GridWorldState>[] = [];
  const width = 6;
  const height = 6;

  // Generate 8 ticks of simulated motion: rover moves forward, harvests crop, turns south
  for (let tick = 0; tick <= 8; tick++) {
    const grid: number[][] = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => CellType.EMPTY as number),
    );
    grid[0]![0] = CellType.BASE;
    grid[2]![2] = CellType.ROCK;
    grid[4]![4] = CellType.RAVINE;

    // Crop at (2, 0) is unharvested until tick 4
    if (tick < 4) {
      grid[0]![2] = CellType.CROP;
    }

    const roverX = Math.min(tick, 3);
    const roverY = 0;
    const heading = tick < 5 ? Direction.EAST : Direction.SOUTH;
    const cropsHarvested = tick >= 4 ? 1 : 0;

    snapshots.push({
      tick,
      stateHash: BigInt(tick * 1000 + 42),
      stateHashHex: `000000000000${(tick * 1000 + 42).toString(16).padStart(4, '0')}`,
      prngState: 100 + tick,
      state: {
        width,
        height,
        rover: {
          x: roverX,
          y: roverY,
          heading,
          energy: 100 - tick * 2,
          inventory: cropsHarvested,
        },
        grid,
        totalCropsInitial: 1,
        cropsHarvested,
        crashed: false,
      },
    });
  }

  return snapshots;
}

const meta: Meta<typeof ReplayViewer> = {
  title: 'Simulation/ReplayViewer',
  component: ReplayViewer,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ReplayViewer>;

export const Default: Story = {
  args: {
    snapshots: createLevelSnapshots(),
    config: {
      width: 6,
      height: 6,
      tileSize: 16,
    },
    levelTitle: 'Robot Farm 1.1: First Furrow',
  },
};

export const HazardCrash: Story = {
  args: {
    snapshots: [
      {
        tick: 4,
        stateHash: 99999n,
        stateHashHex: '000000000001869f',
        prngState: 42,
        state: {
          width: 5,
          height: 5,
          rover: {
            x: 2,
            y: 2,
            heading: Direction.EAST,
            energy: 60,
            inventory: 0,
          },
          grid: Array.from({ length: 5 }, () =>
            Array.from({ length: 5 }, () => CellType.EMPTY as number),
          ),
          totalCropsInitial: 1,
          cropsHarvested: 0,
          crashed: true,
          crashReason: 'Rock hazard collision at (2, 2)',
        },
      },
    ],
    config: {
      width: 5,
      height: 5,
      tileSize: 16,
    },
    levelTitle: 'Hazard Collision Demonstration',
  },
};

export const ReducedMotion: Story = {
  args: {
    snapshots: createLevelSnapshots(),
    config: {
      width: 6,
      height: 6,
      tileSize: 16,
      reducedMotion: true,
    },
    levelTitle: 'Robot Farm 1.9: Battery Relay (Reduced Motion)',
  },
};

export const EnergyDepleted: Story = {
  args: {
    snapshots: [
      {
        tick: 14,
        stateHash: 77777n,
        stateHashHex: '0000000000012fd1',
        prngState: 10901,
        state: {
          width: 6,
          height: 6,
          rover: {
            x: 3,
            y: 1,
            heading: Direction.EAST,
            energy: 0,
            maxEnergy: 16,
            inventory: 2,
          },
          grid: Array.from({ length: 6 }, (_, y) =>
            Array.from({ length: 6 }, (_, x) =>
              x === 5 && y === 1 ? (CellType.BASE as number) : (CellType.EMPTY as number),
            ),
          ),
          totalCropsInitial: 6,
          cropsHarvested: 2,
          crashed: true,
          crashReason: 'ENERGY_DEPLETED',
        },
      },
    ],
    config: {
      width: 6,
      height: 6,
      tileSize: 16,
      reducedMotion: true,
    },
    levelTitle: 'Robot Farm 1.9: Battery Depleted',
  },
};
