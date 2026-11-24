import type { Meta, StoryObj } from '@storybook/react';
import { AppShell } from './AppShell.js';

const meta: Meta<typeof AppShell> = {
  title: 'Shell/AppShell',
  component: AppShell,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof AppShell>;

export const DarkTheme: Story = {
  args: {
    theme: 'dark',
    reducedMotion: false,
    children: (
      <div className="p-8 font-mono text-sm text-[var(--tc-text-muted)]">
        Simulation Viewport Content
      </div>
    ),
  },
};

export const HighContrastReducedMotion: Story = {
  args: {
    theme: 'high-contrast',
    reducedMotion: true,
    children: (
      <div className="p-8 font-mono text-sm text-[var(--tc-text-primary)]">
        High Contrast &amp; Reduced Motion Mode
      </div>
    ),
  },
};
