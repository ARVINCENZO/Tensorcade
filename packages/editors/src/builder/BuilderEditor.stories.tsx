import type { Meta, StoryObj } from '@storybook/react';
import type { ParsonsBlock } from '@tensorcade/contracts';
import { BuilderEditor } from './BuilderEditor.js';

const mockBlocks: ParsonsBlock[] = [
  {
    id: 'block-loop',
    code: 'for step_idx in range(___):',
    isDistractor: false,
  },
  {
    id: 'block-forward',
    code: 'step()',
    isDistractor: false,
  },
  {
    id: 'block-check',
    code: 'if has_crop():',
    isDistractor: false,
  },
  {
    id: 'block-harvest',
    code: 'harvest()',
    isDistractor: false,
  },
  {
    id: 'block-infinite-distractor',
    code: 'while True:',
    isDistractor: true,
    explanationIfChosen:
      'Infinite loop: while True without a break condition consumes all energy and causes a timeout.',
  },
  {
    id: 'block-invalid-method',
    code: 'rover.turn_around()',
    isDistractor: true,
    explanationIfChosen:
      'The robot farm API exposes turn_left() and turn_right(). turn_around() does not exist.',
  },
];

const meta: Meta<typeof BuilderEditor> = {
  title: 'Editors/BuilderEditor',
  component: BuilderEditor,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof BuilderEditor>;

/**
 * Initial state: all blocks reside in the available tray; solution canvas is empty.
 */
export const InitialTray: Story = {
  args: {
    blocks: mockBlocks,
    initialOrder: [],
  },
};

/**
 * Slotted solution: blocks placed with valid Python indentation (0, 4, 8 spaces) and filled blanks.
 */
export const SlottedSolution: Story = {
  args: {
    blocks: mockBlocks,
    initialOrder: [
      {
        id: 'block-loop',
        indent: 0,
        blankValues: { '0': '5' },
      },
      {
        id: 'block-forward',
        indent: 4,
      },
      {
        id: 'block-check',
        indent: 4,
      },
      {
        id: 'block-harvest',
        indent: 8,
      },
    ],
  },
};

/**
 * Distractor warning state: solution containing a distractor block that triggers anti-brute-force educational pause.
 */
export const DistractorWarning: Story = {
  args: {
    blocks: mockBlocks,
    initialOrder: [
      {
        id: 'block-infinite-distractor',
        indent: 0,
      },
      {
        id: 'block-forward',
        indent: 4,
      },
    ],
  },
};
