import type { Meta, StoryObj } from '@storybook/react';
import type { DiagnosticError, ParsonsBlock } from '@tensorcade/contracts';
import { EditorWorkspace } from './EditorWorkspace.js';

const mockBlocks: ParsonsBlock[] = [
  {
    id: 'step-1',
    code: 'step()',
    isDistractor: false,
  },
  {
    id: 'turn-left',
    code: 'turn_left()',
    isDistractor: false,
  },
  {
    id: 'harvest-1',
    code: 'harvest()',
    isDistractor: false,
  },
  {
    id: 'distractor-infinite',
    code: 'while True:',
    isDistractor: true,
    explanationIfChosen: 'Infinite loop will exhaust energy limit before completion.',
  },
];

const mockDiagnosticError: DiagnosticError = {
  errorType: 'IndexError',
  whatHappened:
    'Your code attempted to read row index 3, but the crop grid only has 3 rows (indices 0, 1, and 2).',
  whereItOccurred: {
    line: 4,
    column: 15,
    sourceSnippet: 'crop = field[row_idx, col_idx]',
  },
  whyItMatters:
    'In Python and NumPy, indexing starts at 0. A grid of height 3 has valid row indices [0, 1, 2]. Index 3 looks past the edge.',
  whatToInvestigate:
    'Check your loop boundary in Line 2. Are you iterating range(height) or range(height + 1)?',
  rawTraceback: 'IndexError: index 3 is out of bounds for axis 0 with size 3',
};

const meta: Meta<typeof EditorWorkspace> = {
  title: 'Editors/EditorWorkspace',
  component: EditorWorkspace,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#0B0F17' }],
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof EditorWorkspace>;

export const DefaultExplorer: Story = {
  args: {
    defaultMode: 'explorer',
    supportedModes: ['explorer', 'builder', 'hacker'],
    parsonsBlocks: mockBlocks,
    initialCode: 'def step():\n    pass\n',
  },
};

export const BuilderMode: Story = {
  args: {
    defaultMode: 'builder',
    supportedModes: ['explorer', 'builder', 'hacker'],
    parsonsBlocks: mockBlocks,
  },
};

export const HackerMode: Story = {
  args: {
    defaultMode: 'hacker',
    supportedModes: ['explorer', 'builder', 'hacker'],
    initialCode: `# First Furrow: Solution Skeleton
def step():
    # Move forward and harvest ripe crops
    step()
    if can_harvest():
        harvest()
`,
    lockedRanges: [{ startLine: 1, endLine: 2 }],
  },
};

export const WithDiagnosticError: Story = {
  args: {
    defaultMode: 'hacker',
    supportedModes: ['explorer', 'builder', 'hacker'],
    initialCode: `def harvest_grid(field):\n    for row_idx in range(4):\n        for col_idx in range(3):\n            crop = field[row_idx, col_idx]\n            harvest()\n`,
    diagnosticError: mockDiagnosticError,
  },
};

export const GraduationModalOpen: Story = {
  args: {
    defaultMode: 'explorer',
    supportedModes: ['explorer', 'builder', 'hacker'],
    isGraduationOpen: true,
  },
};
