import type { Meta, StoryObj } from '@storybook/react';
import { LevelControlsBar } from './LevelControlsBar.js';

const meta: Meta<typeof LevelControlsBar> = {
  title: 'LevelPlayer/LevelControlsBar',
  component: LevelControlsBar,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof LevelControlsBar>;

export const Idle: Story = {
  args: {
    levelTitle: 'First Furrow',
    isRunning: false,
    speed: 1,
    isLessonOpen: true,
    hintTierReached: 0,
    onBackToMap: () => {},
    onRun: () => {},
    onStep: () => {},
    onReset: () => {},
    onSpeedChange: () => {},
    onOpenHints: () => {},
    onToggleLesson: () => {},
  },
};

export const ExecutingWithHints: Story = {
  args: {
    ...Idle.args,
    isRunning: true,
    speed: 2,
    isLessonOpen: false,
    hintTierReached: 2,
  },
};
