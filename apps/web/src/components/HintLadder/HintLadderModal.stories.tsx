import type { Meta, StoryObj } from '@storybook/react';
import { LEVEL_1_1_MANIFEST } from '@tensorcade/levels';
import { HintLadderPanel } from './HintLadderModal.js';

const meta: Meta<typeof HintLadderPanel> = {
  title: 'LevelPlayer/HintLadderPanel',
  component: HintLadderPanel,
};

export default meta;
type Story = StoryObj<typeof HintLadderPanel>;

export const Tier0Locked: Story = {
  args: {
    onClose: () => {},
    levelId: LEVEL_1_1_MANIFEST.id,
    worldId: LEVEL_1_1_MANIFEST.worldId,
    hintLadder: LEVEL_1_1_MANIFEST.hintLadder,
    currentMode: 'explorer',
    supportedModes: LEVEL_1_1_MANIFEST.supportedModes,
    initialTierReached: 0,
  },
};

export const Tier3UnlockedWithBuilderFallback: Story = {
  args: {
    ...Tier0Locked.args,
    currentMode: 'hacker',
    initialTierReached: 3,
    onSwitchToBuilder: () => {},
  },
};
