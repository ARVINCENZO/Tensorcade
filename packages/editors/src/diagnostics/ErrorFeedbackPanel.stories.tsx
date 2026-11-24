import type { Meta, StoryObj } from '@storybook/react';
import type { DiagnosticError } from '@tensorcade/contracts';
import { ErrorFeedbackPanel } from './ErrorFeedbackPanel.js';

const sampleIndexError: DiagnosticError = {
  errorType: 'IndexError',
  whatHappened: 'List index out of range: index 3 is out of bounds for axis 0 with size 3.',
  whereItOccurred: {
    line: 4,
    column: 14,
    sourceSnippet: 'crop = field[row_idx, col_idx]',
  },
  whyItMatters:
    'In Python and NumPy, indexing starts at 0. A grid of height 3 has valid row indices [0, 1, 2]. Index 3 looks past the edge of the array.',
  whatToInvestigate:
    'Check your loop boundary in Line 2. Are you iterating range(height) or range(height + 1)?',
  rawTraceback: [
    'Traceback (most recent call last):',
    '  File "<learner_code>", line 4, in <module>',
    '    crop = field[row_idx, col_idx]',
    'IndexError: index 3 is out of bounds for axis 0 with size 3',
  ].join('\n'),
};

const sampleSyntaxError: DiagnosticError = {
  errorType: 'SyntaxError',
  whatHappened: "Python could not understand this code because of a syntax error: expected ':'.",
  whereItOccurred: {
    line: 1,
    column: 14,
    sourceSnippet: 'def harvest_all()',
  },
  whyItMatters:
    'Python grammar requires exact syntax before code can be parsed and executed. Colons define the boundary of compound code blocks.',
  whatToInvestigate:
    'Check for missing colons (:) at the end of def/for/if statements, mismatched brackets (), or unclosed quotes.',
  rawTraceback: [
    '  File "<learner_code>", line 1',
    '    def harvest_all()',
    '                  ^',
    "SyntaxError: expected ':'",
  ].join('\n'),
};

const sampleRuntimeError: DiagnosticError = {
  errorType: 'RuntimeError',
  whatHappened: 'Maximum action limit exceeded (2000 actions). Execution halted.',
  whereItOccurred: {
    line: 5,
    column: 5,
    sourceSnippet: 'rover.step()',
  },
  whyItMatters:
    'A hard execution ceiling protects simulation stability and prevents infinite loops from exhausting memory or freezing the runtime.',
  whatToInvestigate:
    'Inspect your while loop or recursive condition. Ensure your agent state progresses toward an exit condition that terminates execution.',
  rawTraceback: [
    'Traceback (most recent call last):',
    '  File "<learner_code>", line 5, in <module>',
    '    rover.step()',
    'RuntimeError: Maximum action limit exceeded (2000 actions). Execution halted.',
  ].join('\n'),
};

const sampleTimeoutError: DiagnosticError = {
  errorType: 'TimeoutError',
  whatHappened: 'Execution exceeded the 5000ms safety timeout limit.',
  whereItOccurred: {
    line: 3,
    column: 5,
    sourceSnippet: 'while not reached_target():',
  },
  whyItMatters:
    'Non-terminating loops freeze computation. Sandboxed code execution is subject to deterministic wall-clock and tick limits.',
  whatToInvestigate:
    'Review your loop exit condition and verify whether reached_target() can return True given the current agent coordinates.',
  rawTraceback: [
    'Traceback (most recent call last):',
    '  File "<learner_code>", line 3, in <module>',
    '    while not reached_target():',
    'TimeoutError: Execution timed out after 5000ms',
  ].join('\n'),
};

const meta: Meta<typeof ErrorFeedbackPanel> = {
  title: 'Editors/Diagnostics/ErrorFeedbackPanel',
  component: ErrorFeedbackPanel,
  tags: ['autodocs'],
  argTypes: {
    onJumpToLine: { action: 'jumpToLine' },
    onDismiss: { action: 'dismiss' },
  },
};

export default meta;
type Story = StoryObj<typeof ErrorFeedbackPanel>;

export const IndexError: Story = {
  args: {
    error: sampleIndexError,
  },
};

export const SyntaxError: Story = {
  args: {
    error: sampleSyntaxError,
  },
};

export const RuntimeError: Story = {
  args: {
    error: sampleRuntimeError,
  },
};

export const TimeoutError: Story = {
  args: {
    error: sampleTimeoutError,
  },
};
