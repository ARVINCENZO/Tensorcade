import type { Meta, StoryObj } from '@storybook/react';
import { ConsentBanner } from './ConsentBanner.js';

const meta: Meta<typeof ConsentBanner> = {
  title: 'Shell/ConsentBanner',
  component: ConsentBanner,
};

export default meta;
type Story = StoryObj<typeof ConsentBanner>;

export const UndecidedPrompt: Story = {
  args: {
    consent: null,
    onConsentChange: () => {},
  },
};

export const DismissedAfterDecision: Story = {
  args: {
    consent: false,
  },
};
