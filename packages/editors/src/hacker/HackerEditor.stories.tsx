import type { Meta, StoryObj } from '@storybook/react';
import { HackerEditor } from './HackerEditor.js';
import type { DiagnosticError } from '@tensorcade/contracts';

const meta: Meta<typeof HackerEditor> = {
  title: 'Editors/HackerEditor',
  component: HackerEditor,
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
type Story = StoryObj<typeof HackerEditor>;

const DEFAULT_CODE = `def matrix_multiply(a: list[list[float]], b: list[list[float]]) -> list[list[float]]:
    """Compute standard matrix multiplication C = A x B."""
    rows_a = len(a)
    cols_a = len(a[0])
    rows_b = len(b)
    cols_b = len(b[0])
    
    if cols_a != rows_b:
        raise ValueError(f"Incompatible shapes: ({rows_a}, {cols_a}) and ({rows_b}, {cols_b})")
    
    # Initialize zero matrix of shape (rows_a, cols_b)
    result = [[0.0 for _ in range(cols_b)] for _ in range(rows_a)]
    
    for i in range(rows_a):
        for j in range(cols_b):
            for k in range(cols_a):
                result[i][j] += a[i][k] * b[k][j]
                
    return result
`;

const LOCKED_STARTER_CODE = `# --- LEVEL 1: ROBOT NAVIGATION HARNESS [LOCKED] ---
def solution(grid: list[list[int]]) -> list[str]:
    # Write your pathfinding algorithm below.
    # Lines 1-3 are locked starter scaffolding.
    actions = []
    actions.append("MOVE_FORWARD")
    actions.append("HARVEST")
    return actions
`;

const SYNTAX_ERROR_CODE = `def calculate_loss(y_true, y_pred):
    # Missing closing parenthesis on line 3
    loss = sum((yt - yp) ** 2 for yt, yp in zip(y_true, y_pred)
    return loss / len(y_true)
`;

const SYNTAX_DIAGNOSTIC_ERROR: DiagnosticError = {
  errorType: 'SyntaxError',
  whatHappened: "unexpected EOF while parsing, caused by unclosed '(' bracket on line 3.",
  whereItOccurred: {
    line: 3,
    column: 12,
    sourceSnippet: '    loss = sum((yt - yp) ** 2 for yt, yp in zip(y_true, y_pred)',
  },
  whyItMatters: 'Python expressions must be syntactically balanced before the AST can be compiled into bytecode.',
  whatToInvestigate: 'Inspect line 3 and check that every opening parenthesis has a corresponding closing parenthesis.',
  rawTraceback: '  File "solution.py", line 3\n    loss = sum((yt - yp) ** 2 for yt, yp in zip(y_true, y_pred)\n                                                                 ^\nSyntaxError: was never closed',
};

const RUNTIME_DIAGNOSTIC_ERROR: DiagnosticError = {
  errorType: 'IndexError',
  whatHappened: 'list index out of range at index 10 when accessing weights array of length 10.',
  whereItOccurred: {
    line: 7,
    column: 13,
    sourceSnippet: '    weight = weights[i + 1]',
  },
  whyItMatters: 'Zero-indexed arrays have valid indices from 0 to len-1; accessing index len causes an off-by-one fault.',
  whatToInvestigate: 'Check the upper loop bound. Consider whether range(len(weights) - 1) is intended.',
};

export const Default: Story = {
  args: {
    code: DEFAULT_CODE,
    height: '450px',
  },
};

export const LockedRegions: Story = {
  args: {
    code: LOCKED_STARTER_CODE,
    lockedRanges: [{ startLine: 1, endLine: 3 }],
    height: '450px',
  },
};

export const SyntaxError: Story = {
  args: {
    code: SYNTAX_ERROR_CODE,
    diagnosticError: SYNTAX_DIAGNOSTIC_ERROR,
    height: '450px',
  },
};

export const RuntimeError: Story = {
  args: {
    code: `def forward(weights, inputs):
    total = 0.0
    for i in range(len(weights)):
        # Off-by-one error triggers IndexError on last element
        total += weights[i + 1] * inputs[i]
    return total
`,
    diagnosticError: RUNTIME_DIAGNOSTIC_ERROR,
    height: '450px',
  },
};

export const ReadOnly: Story = {
  args: {
    code: DEFAULT_CODE,
    readOnly: true,
    height: '450px',
  },
};
