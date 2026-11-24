import type { Meta, StoryObj } from '@storybook/react';
import { LEVEL_1_1_BUNDLE } from '@tensorcade/levels';
import { LevelPlayer } from './LevelPlayer.js';

const StubEditor = () => (
  <div className="flex h-80 items-center justify-center rounded-[var(--tc-radius-md)] border border-[var(--tc-border-subtle)] bg-[var(--tc-bg-surface)] font-mono text-xs text-[var(--tc-text-muted)]">
    Editor Workspace (Storybook Stub)
  </div>
);

const StubReplay = () => (
  <div className="flex h-80 items-center justify-center rounded-[var(--tc-radius-md)] border border-[var(--tc-border-subtle)] bg-[var(--tc-bg-surface)] font-mono text-xs text-[var(--tc-text-muted)]">
    Simulation Viewport (Storybook Stub)
  </div>
);

const meta: Meta<typeof LevelPlayer> = {
  title: 'LevelPlayer/LevelPlayer',
  component: LevelPlayer,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof LevelPlayer>;

export const Default: Story = {
  args: {
    bundle: LEVEL_1_1_BUNDLE,
    editorComponent: StubEditor,
    replayViewerComponent: StubReplay,
    onBackToMap: () => {},
    onNextLevel: () => {},
  },
};
