import type { Meta, StoryObj } from '@storybook/react';
import { SettingsPanel } from './SettingsModal.js';

const meta: Meta<typeof SettingsPanel> = {
  title: 'Shell/SettingsPanel',
  component: SettingsPanel,
};

export default meta;
type Story = StoryObj<typeof SettingsPanel>;

export const DefaultSettings: Story = {
  args: {
    settings: {
      theme: 'dark',
      reducedMotion: false,
      lowSpecMode: false,
      acousticTelemetry: false,
    },
  },
};

export const HighContrastLowSpec: Story = {
  args: {
    settings: {
      theme: 'high-contrast',
      reducedMotion: true,
      lowSpecMode: true,
      acousticTelemetry: false,
    },
  },
};
