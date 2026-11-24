import type { Meta, StoryObj } from '@storybook/react';
import { WorldMapLayout } from './WorldMapLayout.js';
import { DEFAULT_WORLD_CATALOG } from '../../data/defaultCatalog.js';

const meta: Meta<typeof WorldMapLayout> = {
  title: 'Shell/WorldMapLayout',
  component: WorldMapLayout,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof WorldMapLayout>;

export const FreshGuest: Story = {
  args: {
    catalog: DEFAULT_WORLD_CATALOG,
    progress: {},
    onSelectLevel: () => {},
  },
};

export const ProgressedLearner: Story = {
  args: {
    catalog: DEFAULT_WORLD_CATALOG,
    progress: {
      'w1-robot-farm-1.1': {
        levelId: 'w1-robot-farm-1.1',
        worldId: 'world-1',
        starsEarned: 3,
        clearedModes: ['explorer', 'builder', 'hacker'],
        attempts: 2,
        bestScore: 300,
        hintTierReached: 0,
        synced: false,
        updatedAt: 1700000000000,
      },
    },
    onSelectLevel: () => {},
  },
};

export const EmptyCatalog: Story = {
  args: {
    catalog: { worlds: [] },
    progress: {},
    onSelectLevel: () => {},
  },
};
