/**
 * Pedagogical Diagnostic Error Mapper.
 *
 * Conforms to docs/02-learning-design.md §5 and docs/14-sandbox-and-threat-model.md §3:
 * - Strips internal Pyodide/CPython harness stack frames.
 * - Resolves exact line and column coordinates in learner code.
 * - Formulates 4-part pedagogical diagnostic feedback:
 *   1. What Happened (plain English explanation)
 *   2. Where It Occurred ({ line, column, sourceSnippet })
 *   3. Why It Matters (algorithmic concept rationale)
 *   4. What to Investigate (targeted actionable advice)
 */

import type { DiagnosticError } from '@tensorcade/contracts';

interface ErrorExplanation {
  readonly whatHappened: string;
  readonly whyItMatters: string;
  readonly whatToInvestigate: string;
}

const ERROR_EXPLANATIONS: Record<string, (details: string) => ErrorExplanation> = {
  SyntaxError: (details) => ({
    whatHappened: `Python could not understand this code because of a syntax error: ${details || 'invalid syntax'}.`,
    whyItMatters:
      'Python grammar requires exact syntax before code can be parsed and executed.',
    whatToInvestigate:
      'Check for missing colons (:) at the end of def/for/if statements, mismatched brackets (), or unclosed quotes.',
  }),
  IndentationError: (details) => ({
    whatHappened: `Indentation mismatch: ${details || 'expected an indented block'}.`,
    whyItMatters:
      'Python uses whitespace indentation instead of curly braces to determine which statements belong inside functions, loops, and conditions.',
    whatToInvestigate:
      'Ensure code blocks inside functions, for/while loops, and if-statements are indented with exactly 4 spaces.',
  }),
  NameError: (details) => ({
    whatHappened: `You referenced a name that is not recognized: ${details}.`,
    whyItMatters:
      'Variables, functions, and modules must be defined or imported before they can be used.',
    whatToInvestigate:
      'Check for spelling typos or ensure the variable is defined prior to being accessed.',
  }),
  IndexError: (details) => ({
    whatHappened: `List index out of range: ${details}.`,
    whyItMatters:
      'Python sequences are 0-indexed. For a list of length N, valid positive indices are 0 to N-1.',
    whatToInvestigate:
      'Verify the length of your list or array. Remember that accessing index N on a list of length N will fail.',
  }),
  KeyError: (details) => ({
    whatHappened: `Dictionary key not found: ${details}.`,
    whyItMatters:
      'Dictionaries only contain mappings for keys that have been explicitly stored.',
    whatToInvestigate:
      'Check if the key exists using "if key in dict:" or use "dict.get(key, default)" to avoid KeyError.',
  }),
  ZeroDivisionError: () => ({
    whatHappened: 'You attempted to divide a number by zero.',
    whyItMatters:
      'Division by zero is mathematically undefined and cannot produce a valid numeric result.',
    whatToInvestigate:
      'Check denominators and divisor calculations to ensure they never equal 0 before dividing.',
  }),
  TypeError: (details) => ({
    whatHappened: `Incompatible data type: ${details}.`,
    whyItMatters:
      'Python operations require operands of compatible types (e.g. you cannot perform arithmetic between text strings and numbers without converting).',
    whatToInvestigate:
      'Check the types of your variables using type() and ensure functions return expected types.',
  }),
  AttributeError: (details) => ({
    whatHappened: `Attribute or method not found: ${details}.`,
    whyItMatters:
      'Different objects provide different methods (e.g. a Python list has .append(), while a NumPy array has .shape).',
    whatToInvestigate:
      'Confirm the exact data type of the object you are inspecting and verify that the method name is spelled correctly.',
  }),
  MemoryError: () => ({
    whatHappened: 'Memory allocation limit exceeded (attempted to allocate more memory than permitted in this sandbox).',
    whyItMatters:
      'Algorithms on memory-constrained systems must operate within bounded memory footprints.',
    whatToInvestigate:
      'Check array dimensions, infinite lists, or generator expressions to reduce memory usage.',
  }),
  RuntimeError: (details) => ({
    whatHappened: `Runtime constraint exceeded: ${details || 'an unexpected runtime condition occurred'}.`,
    whyItMatters:
      'Runtime constraints (such as maximum action limits or state invariants) protect simulation stability and prevent runaway execution.',
    whatToInvestigate:
      'Check whether your code contains an infinite loop generating excessive actions or violating simulation limits.',
  }),
  TimeoutError: (details) => ({
    whatHappened: `Execution timed out: ${details || 'Code execution exceeded time limit (5.0s)'}. An infinite loop or excessive recursion was safely stopped.`,
    whyItMatters:
      'Non-terminating loops freeze computation and waste resources. Safe environments enforce hard limits.',
    whatToInvestigate:
      'Check your while-loop exit conditions, ensure loop counters advance, or verify recursion base cases.',
  }),
  KeyboardInterrupt: () => ({
    whatHappened: 'Execution was interrupted because it exceeded the 5.0 second timeout limit.',
    whyItMatters:
      'Non-terminating loops freeze computation and must be interrupted to keep the browser responsive.',
    whatToInvestigate:
      'Check your while-loop exit conditions, ensure loop counters advance, or verify recursion base cases.',
  }),
};

export class DiagnosticErrorMapper {
  /**
   * Translates a raw Python error or traceback into structured 4-part pedagogical feedback.
   */
  public static mapError(rawError: string | Error, userCode: string): DiagnosticError {
    const rawTraceback = typeof rawError === 'string' ? rawError : (rawError.stack ?? rawError.message);
    const lines = userCode.split('\n');

    // 1. Identify exception class and message
    // Typically the last non-empty line: "IndexError: list index out of range"
    const tbLines = rawTraceback.trim().split('\n');
    let errorType = 'RuntimeError';
    let errorDetails = '';

    for (let i = tbLines.length - 1; i >= 0; i--) {
      const line = tbLines[i]?.trim() ?? '';
      const match = line.match(/^([A-Za-z0-9_]+Error|KeyboardInterrupt|Exception)(?::\s*(.*))?$/);
      if (match && match[1]) {
        errorType = match[1];
        errorDetails = match[2]?.trim() ?? '';
        break;
      }
    }

    // 2. Extract line and column in user code
    // Matches frames like: File "<learner_code>", line 4, in <module>
    let errorLine = 1;
    let errorColumn = 1;

    for (let i = 0; i < tbLines.length; i++) {
      const tbLine = tbLines[i] ?? '';
      const fileMatch = tbLine.match(/File\s+["'](?:<learner_code>|<exec>|<string>)["'],\s+line\s+(\d+)/);
      if (fileMatch && fileMatch[1]) {
        errorLine = parseInt(fileMatch[1], 10);

        // Check next line for source snippet or indicator line (^^^^)
        const nextLine = tbLines[i + 1] ?? '';
        const caretLine = tbLines[i + 2] ?? '';
        if (caretLine.includes('^')) {
          errorColumn = Math.max(1, caretLine.indexOf('^') + 1);
        } else if (nextLine.includes('^')) {
          errorColumn = Math.max(1, nextLine.indexOf('^') + 1);
        }
      }
    }

    // Fallback: If errorLine is beyond user code bounds, clamp
    const safeLine = Math.min(Math.max(1, errorLine), Math.max(1, lines.length));
    const sourceSnippet = lines[safeLine - 1]?.trim() ?? '';

    // 3. Generate pedagogical 4-part explanation
    const explanationFactory = ERROR_EXPLANATIONS[errorType] ?? ((details: string) => ({
      whatHappened: `A runtime error occurred: ${details || errorType}.`,
      whyItMatters: 'The program encountered an unexpected state during execution.',
      whatToInvestigate: 'Examine the logic leading up to line ' + safeLine + '.',
    }));

    const explanation = explanationFactory(errorDetails);

    return {
      errorType,
      whatHappened: explanation.whatHappened,
      whereItOccurred: {
        line: safeLine,
        column: errorColumn,
        sourceSnippet,
      },
      whyItMatters: explanation.whyItMatters,
      whatToInvestigate: explanation.whatToInvestigate,
      rawTraceback,
    };
  }
}
