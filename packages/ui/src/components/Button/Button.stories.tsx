import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button.js';

const meta: Meta<typeof Button> = {
  title: 'Primitives/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'ghost'],
      description: 'Visual importance and semantic role',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Button size dimension',
    },
    disabled: {
      control: 'boolean',
    },
    children: {
      control: 'text',
    },
  },
  args: {
    children: 'Execute Simulation',
    variant: 'primary',
    size: 'md',
    disabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Run (Ctrl+Enter)',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Reset Tick 0',
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'Abort Process',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'View Hint',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Compiling...',
  },
};
