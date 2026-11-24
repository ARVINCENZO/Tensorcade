import type { Meta, StoryObj } from '@storybook/react';
import { LEVEL_1_1_MANIFEST } from '@tensorcade/levels';
import { ResultModalPanel } from './ResultModal.js';

const meta: Meta<typeof ResultModalPanel> = {
  title: 'LevelPlayer/ResultModalPanel',
  component: ResultModalPanel,
};

export default meta;
type Story = StoryObj<typeof ResultModalPanel>;

export const PassedExplorerWithGraduation: Story = {
  args: {
    onClose: () => {},
    levelTitle: LEVEL_1_1_MANIFEST.title,
    scoringRubric: LEVEL_1_1_MANIFEST.scoringRubric,
    supportedModes: LEVEL_1_1_MANIFEST.supportedModes,
    nextLevelId: 'w1-robot-farm-1.2',
    onGraduateToHacker: () => {},
    onNextLevel: () => {},
    onRetry: () => {},
    result: {
      passed: true,
      starsEarned: 2,
      star1Earned: true,
      star2Earned: true,
      star3Earned: false,
      ticks: 2,
      energyRemaining: 98,
      mode: 'explorer',
      seedsPassed: 5,
      totalSeeds: 5,
    },
  },
};

export const PassedHacker3Stars: Story = {
  args: {
    ...PassedExplorerWithGraduation.args,
    result: {
      passed: true,
      starsEarned: 3,
      star1Earned: true,
      star2Earned: true,
      star3Earned: true,
      ticks: 2,
      energyRemaining: 98,
      mode: 'hacker',
      seedsPassed: 5,
      totalSeeds: 5,
    },
  },
};

export const Failed: Story = {
  args: {
    ...PassedExplorerWithGraduation.args,
    result: {
      passed: false,
      starsEarned: 0,
      star1Earned: false,
      star2Earned: false,
      star3Earned: false,
      ticks: 5,
      energyRemaining: 0,
      mode: 'hacker',
      seedsPassed: 0,
      totalSeeds: 5,
      message: 'Rover ran out of energy before harvesting all crops.',
    },
  },
};
