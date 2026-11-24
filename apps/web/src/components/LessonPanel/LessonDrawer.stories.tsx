import type { Meta, StoryObj } from '@storybook/react';
import { LEVEL_1_1_BUNDLE } from '@tensorcade/levels';
import { LessonDrawer } from './LessonDrawer.js';

const meta: Meta<typeof LessonDrawer> = {
  title: 'LevelPlayer/LessonDrawer',
  component: LessonDrawer,
};

export default meta;
type Story = StoryObj<typeof LessonDrawer>;

export const Open: Story = {
  args: {
    isOpen: true,
    title: LEVEL_1_1_BUNDLE.manifest.title,
    conceptTag: LEVEL_1_1_BUNDLE.manifest.conceptTag,
    bloomLevel: LEVEL_1_1_BUNDLE.manifest.bloomLevel,
    estimatedMinutes: LEVEL_1_1_BUNDLE.manifest.estimatedMinutes,
    lessonContentMarkdown: LEVEL_1_1_BUNDLE.lessonContentMarkdown,
    simplificationLabel: LEVEL_1_1_BUNDLE.manifest.simplificationLabel,
    learningObjective: LEVEL_1_1_BUNDLE.manifest.learningObjective,
    onClose: () => {},
  },
};

export const Closed: Story = {
  args: {
    ...Open.args,
    isOpen: false,
  },
};
