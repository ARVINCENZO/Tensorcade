import type { Meta, StoryObj } from '@storybook/react';
import { OnboardingBanner } from './OnboardingBanner.js';

const meta: Meta<typeof OnboardingBanner> = {
  title: 'Shell/OnboardingBanner',
  component: OnboardingBanner,
};

export default meta;
type Story = StoryObj<typeof OnboardingBanner>;

export const VisibleForNewGuest: Story = {
  args: {
    completedCount: 0,
    onStartFirstLevel: () => {},
  },
};

export const HiddenAfterCompletion: Story = {
  args: {
    completedCount: 1,
    onStartFirstLevel: () => {},
  },
};
